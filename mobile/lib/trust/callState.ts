/**
 * The single product state model during a call.
 *
 *   Outside a call : ready | offline-setup
 *   During a call  : trusted | verify | risk | initializing | capture_unavailable | analyzing | sending | needs_review | offline | error
 *
 * The full state machine ensures the overlay NEVER shows a permanent "Verify"
 * label as if verification were occurring. Each state represents a distinct,
 * honest phase of the trust evaluation pipeline.
 *
 * The central rule: **call activity alone can never produce a trusted state.**
 * A trusted state requires a *server-confirmed mutual session* that this device
 * also verified locally against its own circle secret. Anything else — no
 * session, expired session, rejected proof, unreachable backend, unconfirmed
 * audio analysis — is `verify` or a more specific diagnostic state.
 *
 * Precedence: risk > trusted > verifying states > verify/offline/error
 * "protected" is not a state this module can produce.
 */

export type CallState =
  | "trusted"
  | "verify"
  | "risk"
  | "initializing"
  | "capture_unavailable"
  | "analyzing"
  | "sending"
  | "verifying"
  | "needs_review"
  | "offline"
  | "error";

export type OutsideCallState = "ready" | "offline";

export interface TrustEvidence {
  /** The server reported the two devices are bound to one session. */
  serverConfirmed: boolean;
  /** This device independently recomputed and matched the attestation. */
  attestationVerified: boolean;
}

export interface CallContext {
  /** Carrier/telephony observed an active or ringing call. */
  callActive: boolean;
  /** A trusted relationship for this circle exists on this device. */
  hasTrustedCircle: boolean;
  /** This device is still enrolled and not revoked. */
  deviceAuthorized: boolean;
  /** Round-trip to the trust backend succeeded. */
  backendReachable: boolean;
  trust: TrustEvidence | null;
  /** Real-time risk analysis reported a threshold crossing. */
  riskDetected: boolean;
  /** Audio capture is available and working. */
  audioAvailable: boolean;
  /** Analysis request is in flight. */
  analysisInFlight: boolean;
}

export interface CallDecision {
  state: CallState;
  /** Short label for the overlay pill. */
  label: string;
  /** One-line explanation. Never claims more than the evidence supports. */
  detail: string;
}

/**
 * Derives the call state. Pure and total: every input maps to exactly one state.
 *
 * Precedence is deliberate — a risk signal outranks a trust confirmation,
 * because a trusted counterpart can still be under pressure.
 * Audio/analysis states outrank verify/offline because they represent
 * active progress toward a verdict.
 */
export function deriveCallState(ctx: CallContext): CallDecision {
  // Risk always wins — a trusted person can still be under duress
  if (ctx.riskDetected) {
    return {
      state: "risk",
      label: "Handshake · Risk detected",
      detail: "Handshake detected pressure tactics in this call.",
    };
  }

  // Not in a call — outside-call states
  if (!ctx.callActive) {
    return {
      state: "verify",
      label: "Handshake · Ready",
      detail: "Handshake is watching for calls.",
    };
  }

  // In a call — evaluate trust evidence
  const trusted =
    ctx.trust !== null && ctx.trust.serverConfirmed && ctx.trust.attestationVerified;

  if (trusted) {
    return {
      state: "trusted",
      label: "Handshake · Trusted connection",
      detail: "Both phones confirmed the same trusted relationship.",
    };
  }

  // If we have a trusted circle but analysis is in progress, show progress states
  if (ctx.hasTrustedCircle && ctx.deviceAuthorized) {
    if (!ctx.backendReachable) {
      return {
        state: "offline",
        label: "Handshake · Offline",
        detail: "Cannot reach server to confirm this call.",
      };
    }

    if (!ctx.audioAvailable) {
      return {
        state: "capture_unavailable",
        label: "Handshake · Unable to verify",
        detail: "Call audio cannot be accessed for analysis.",
      };
    }

    if (ctx.analysisInFlight) {
      // Determine which analysis phase we're in
      if (ctx.trust !== null && ctx.trust.serverConfirmed) {
        // Server confirmed but attestation not yet verified locally
        return {
          state: "verifying",
          label: "Handshake · Verifying…",
          detail: "Confirming both phones match this call.",
        };
      }
      return {
        state: "analyzing",
        label: "Handshake · Analyzing…",
        detail: "Evaluating trust signals for this call.",
      };
    }

    // Has trusted circle, backend reachable, audio available, but no analysis started yet
    return {
      state: "initializing",
      label: "Handshake · Initializing…",
      detail: "Preparing to verify this call.",
    };
  }

  // No trusted circle or device not authorized
  if (!ctx.hasTrustedCircle) {
    return {
      state: "verify",
      label: "Handshake · Verify",
      detail: "Add a trusted person before the call to confirm it automatically.",
    };
  }
  if (!ctx.deviceAuthorized) {
    return {
      state: "verify",
      label: "Handshake · Verify",
      detail: "This phone's trust for this person was revoked.",
    };
  }

  // Fallback — should not reach here with valid inputs
  return {
    state: "verify",
    label: "Handshake · Verify",
    detail: "Handshake could not confirm both phones in this call.",
  };
}

/** Outside a call the product is a calm trust centre, not a warning surface. */
export function deriveOutsideCallState(backendReachable: boolean): {
  state: OutsideCallState;
  label: string;
  detail: string;
} {
  return backendReachable
    ? {
        state: "ready",
        label: "Protection ready",
        detail: "Handshake watches for calls and checks trusted people.",
      }
    : {
        state: "offline",
        label: "Handshake · Offline",
        detail: "Calls cannot be confirmed until the server is reachable.",
      };
}