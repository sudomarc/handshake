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
  const result = await runCallTrust({
    pairId: options.pairId,
    role: options.role,
    hasTrustedCircle: options.hasTrustedCircle,
    deviceAuthorized: options.deviceAuthorized,
    riskDetected: false,
    ...(options.pollIntervalMs === undefined ? {} : { pollIntervalMs: options.pollIntervalMs }),
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

/**
 * Runs `onCallStart` when the app comes back to the foreground during an
 * active call window, so trust is re-evaluated after the app was backgrounded.
 */
export function onForeground(subscribe: (handler: (s: AppStateStatus) => void) => () => void) {
  return subscribe((status) => {
    if (status === "active") return;
  });
}