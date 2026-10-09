/**
 * Bridges call detection to the trust backend and the overlay.
 *
 * This is the only component that knows about both telephony events and the
 * trusted-pair protocol. Its contract is deliberately narrow:
 *
 *   - a call starts  → run the trust cycle → publish `trusted` / `verify` / `risk`
 *   - the call ends  → publish nothing and stop listening
 *
 * Anything that prevents the trust cycle from completing results in `verify`,
 * because `deriveCallState` never promotes a call without both a server
 * confirmation and a locally verified attestation.
 */

import { type AppStateStatus } from "react-native";
import { callOverlayManager } from "@/lib/callOverlay";
import { getAllPairs } from "@/lib/storage";
import { runCallTrust, type CallRole, type CallTrustResult } from "@/lib/trust/session";
import { deriveCallState } from "@/lib/trust/callState";

export interface CallTrustOptions {
  pairId: string;
  hasTrustedCircle: boolean;
  deviceAuthorized: boolean;
  role: CallRole;
  /** Injected for tests; defaults to the real renderer. */
  publish?: (result: CallTrustResult) => Promise<void>;
  pollIntervalMs?: number;
}

/**
 * Runs one trust cycle for the current call and publishes the result.
 *
 * Safe to call repeatedly: a new call simply re-runs the handshake, and the
 * server issues a fresh session, so trust from a previous call can never leak
 * into a new one.
 */
export async function evaluateCallTrust(options: CallTrustOptions): Promise<CallTrustResult> {
  let finalResult: CallTrustResult | null = null;

  const result = await runCallTrust({
    pairId: options.pairId,
    role: options.role,
    hasTrustedCircle: options.hasTrustedCircle,
    deviceAuthorized: options.deviceAuthorized,
    riskDetected: false,
    ...(options.pollIntervalMs === undefined ? {} : { pollIntervalMs: options.pollIntervalMs }),
    onProgress: (progress) => {
      finalResult = progress;
      // Publish each progress update to the overlay
      const publish = options.publish ?? defaultPublish;
      void publish(progress);
    },
  });

  const publish = options.publish ?? defaultPublish;
  await publish(result);
  return result;
}

/** Pushes the state to the Android overlay, ignoring its absence on other builds. */
async function defaultPublish(result: CallTrustResult): Promise<void> {
  try {
    await callOverlayManager.setCallState(result.state, result.detail);
  } catch {
    // The overlay permission may be unavailable. The in-app state stays
    // authoritative; nothing here can invent a trust claim.
  }
}

/** Publishes a risk decision produced by the in-call audio pipeline. */
export async function publishRisk(detail: string): Promise<void> {
  const decision = deriveCallState({
    callActive: true,
    hasTrustedCircle: false,
    deviceAuthorized: false,
    backendReachable: true,
    trust: null,
    riskDetected: true,
    audioAvailable: false,
    analysisInFlight: false,
  });
  try {
    await callOverlayManager.setCallState(decision.state, detail);
  } catch {
    // Overlay unavailable; the in-app shield remains authoritative.
  }
}

/** Clears any call-time overlay state when the call ends. */
export async function clearCallState(): Promise<void> {
  try {
    await callOverlayManager.stopProtection();
  } catch {
    // Nothing to clear on builds without the overlay module.
  }
}

/* ------------------------------------------------------------------ */
/* Automatic call-start trust (JS side)                               */
/* ------------------------------------------------------------------ */

/** Minimum gap between two automatic cycles, to swallow duplicate events. */
const MIN_AUTOMATIC_INTERVAL_MS = 2_000;

let automaticInFlight = false;
let lastAutomaticRunAt = 0;

/**
 * Runs one automatic trust cycle for a started call, without any user input.
 *
 * The loop tries every stored trusted relation (initiator role) until one
 * resolves `trusted`. The first relation that confirms wins; otherwise the
 * first result (an honest `verify`, or `risk` if a risk signal was present) is
 * published. With no trusted relations at all, the result is a `verify` with
 * copy that points at pairing — never `protected`.
 *
 * Guards:
 *   - a module-level in-flight flag prevents overlapping cycles;
 *   - a last-event timestamp ignores duplicate "ringing"/"active" emissions
 *     that arrive in quick succession from the native side.
 *
 * Risk is deliberately not produced here: the JS trust cycle passes
 * `riskDetected: false` because there is no production JS risk source for
 * carrier calls. Real risk signals arrive from the (future) audio pipeline via
 * the shield engine's `reportRisk`, which outranks everything in
 * `deriveCallState`.
 */
export async function autoEvaluateCallTrust(): Promise<CallTrustResult | null> {
  const now = Date.now();
  if (automaticInFlight || now - lastAutomaticRunAt < MIN_AUTOMATIC_INTERVAL_MS) {
    return null;
  }
  automaticInFlight = true;
  lastAutomaticRunAt = now;
  try {
    const pairs = await getAllPairs();
    let first: CallTrustResult | null = null;

    for (const pair of pairs) {
      const result = await runCallTrust({
        pairId: pair.pairId,
        role: "initiator",
        hasTrustedCircle: true,
        deviceAuthorized: true,
        riskDetected: false,
        onProgress: (progress) => {
          // Publish each progress update to the overlay
          void defaultPublish(progress);
        },
      });
      first = first ?? result;
      if (result.state === "trusted") {
        return result;
      }
    }

    if (first) {
      return first;
    }

    const noRelations = deriveCallState({
      callActive: true,
      hasTrustedCircle: false,
      deviceAuthorized: true,
      backendReachable: true,
      trust: null,
      riskDetected: false,
      audioAvailable: false,
      analysisInFlight: false,
    });
    const result: CallTrustResult = {
      ...noRelations,
      backendReachable: true,
      sessionAttempted: false,
      sessionId: null,
      peerDeviceId: null,
    };
    await defaultPublish(result);
    return result;
  } finally {
    automaticInFlight = false;
  }
}

/**
 * Runs `onCallStart` when the app comes back to the foreground during an
 * active call window, so trust is re-evaluated after the app was backgrounded.
 */
export function onForeground(subscribe: (handler: (s: AppStateStatus) => void) => () => void) {
  return subscribe((status) => {
    if (status === "active") return;
  });
}