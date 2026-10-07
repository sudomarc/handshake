/**
 * In-call orchestration: the exact sequence from the product direction.
 *
 *   CALL START
 *     → identify local Handshake account/device
 *     → establish or discover the active Handshake session
 *     → contact the trusted-pair backend
 *     → mutually authenticate the two installations
 *     → confirm both endpoints belong to a previously trusted relationship
 *     → derive trusted call state
 *     → show overlay
 *
 * Both roles run the same loop. Whichever side gets there first opens a session;
 * the other discovers and joins it. Either way the result is a single
 * `CallTrustResult` the overlay can render without knowing any internals.
 *
 * Every failure path here resolves to `unverified`. That is the single most
 * important property of this module: there is no branch that reaches `trusted`
 * without a server-confirmed session *and* a locally verified attestation.
 */

import {
  TrustNetworkError,
  findPendingSession,
  joinSession,
  openSession,
  pollSession,
  verifySessionTrust,
} from "@/lib/trust/api";
import { deriveCallState, type CallContext, type CallDecision } from "@/lib/trust/callState";
import { getDeviceId } from "@/lib/trust/deviceIdentity";

export type CallRole = "initiator" | "peer";

export interface CallTrustResult extends CallDecision {
  /** True when the backend answered at all. Drives the honest offline copy. */
  backendReachable: boolean;
  /** True when this device attempted to join or was joined this cycle. */
  sessionAttempted: boolean;
  sessionId: string | null;
  peerDeviceId: string | null;
}

export interface RunTrustOptions {
  pairId: string;
  role: CallRole;
  hasTrustedCircle: boolean;
  deviceAuthorized: boolean;
  riskDetected: boolean;
  /** Wall-clock budget for the whole handshake. */
  timeoutMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deadlineExceeded(start: number, timeoutMs: number, now: () => number): boolean {
  return now() - start >= timeoutMs;
}

/**
 * Runs one full trust cycle for an active call and returns the state to render.
 *
 * A cycle is bounded by `timeoutMs` so the overlay never sits in a spinner
 * while a call is in progress; on timeout the result is `verify`.
 */
export async function runCallTrust(options: RunTrustOptions): Promise<CallTrustResult> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = now();

  const finish = (input: {
    backendReachable: boolean;
    sessionAttempted: boolean;
    sessionId: string | null;
    peerDeviceId: string | null;
    trust: CallContext["trust"];
  }): CallTrustResult => {
    const context: CallContext = {
      callActive: true,
      hasTrustedCircle: options.hasTrustedCircle,
      deviceAuthorized: options.deviceAuthorized,
      backendReachable: input.backendReachable,
      trust: input.trust,
      riskDetected: options.riskDetected,
    };
    return {
      ...deriveCallState(context),
      backendReachable: input.backendReachable,
      sessionAttempted: input.sessionAttempted,
      sessionId: input.sessionId,
      peerDeviceId: input.peerDeviceId,
    };
  };

  // Without a pre-established relationship there is nothing to confirm, and
  // asking the server would be pointless. Report honestly instead.
  if (!options.hasTrustedCircle) {
    return finish({
      backendReachable: true,
      sessionAttempted: false,
      sessionId: null,
      peerDeviceId: null,
      trust: null,
    });
  }

  let backendReachable = true;
  let sessionId: string | null = null;

  try {
    const opened =
      options.role === "initiator"
        ? await openSession(options.pairId)
        : await findPendingSession(options.pairId).then(async (pending) => {
            if (pending) return pending;
            // The peer may not have opened one yet; open our own and let them
            // discover it. This keeps both roles working regardless of who
            // noticed the call first.
            return openSession(options.pairId);
          });

    sessionId = opened.sessionId;

    const localDeviceId = await getDeviceId();
    if (options.role === "peer" && opened.openedByDeviceId !== localDeviceId) {
      const joined = await joinSession({
        sessionId: opened.sessionId,
        pairId: options.pairId,
        peerDeviceId: opened.openedByDeviceId,
      });
      const trust = await verifySessionTrust({ pairId: options.pairId, status: joined });
      return finish({
        backendReachable: true,
        sessionAttempted: true,
        sessionId: joined.sessionId,
        peerDeviceId: joined.peerDeviceId,
        trust,
      });
    }

    // Poll until the peer joins or the budget runs out.
    while (!deadlineExceeded(startedAt, timeoutMs, now)) {
      const status = await pollSession(options.pairId, opened.sessionId);
      if (status.state === "trusted") {
        const trust = await verifySessionTrust({ pairId: options.pairId, status });
        return finish({
          backendReachable: true,
          sessionAttempted: true,
          sessionId: status.sessionId,
          peerDeviceId: status.peerDeviceId,
          trust,
        });
      }
      if (deadlineExceeded(startedAt, timeoutMs, now)) break;
      await sleep(pollIntervalMs);
    }

    return finish({
      backendReachable: true,
      sessionAttempted: true,
      sessionId: opened.sessionId,
      peerDeviceId: null,
      trust: null,
    });
  } catch (error) {
    if (error instanceof TrustNetworkError) backendReachable = false;
    return finish({
      backendReachable,
      sessionAttempted: sessionId !== null,
      sessionId,
      peerDeviceId: null,
      trust: null,
    });
  }
}