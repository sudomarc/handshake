/**
 * The single product state model during a call.
 *
 *   Outside a call : ready | offline-setup
 *   During a call  : trusted | verify | risk
 *
 * Nothing here mentions VAD, STT, nonces, session ids, device ids or risk
 * models. Those live in the callers; this module only decides which of the three
 * call states the user is allowed to be shown, and under which conditions.
 *
 * The central rule: **call activity alone can never produce a trusted state.**
 * A trusted state requires a *server-confirmed mutual session* that this device
 * also verified locally against its own circle secret. Anything else — no
 * session, expired session, rejected proof, unreachable backend, unconfirmed
 * audio analysis — is `verify`.
 */

export type CallState = "trusted" | "verify" | "risk";
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
 */
export function deriveCallState(ctx: CallContext): CallDecision {
  if (ctx.riskDetected) {
    return {
      state: "risk",
      label: "Handshake · Risk detected",
      detail: "Handshake detected pressure tactics in this call.",
    };
  }

  const trusted =
    ctx.trust !== null && ctx.trust.serverConfirmed && ctx.trust.attestationVerified;

  if (trusted && ctx.callActive) {
    return {
      state: "trusted",
      label: "Handshake · Trusted connection",
      detail: "Both phones confirmed the same trusted relationship.",
    };
  }

  // Everything else is `verify`, with the reason stated honestly.
  if (!ctx.callActive) {
    return {
      state: "verify",
      label: "Handshake · Ready",
      detail: "Handshake is watching for calls.",
    };
  }
  if (!ctx.backendReachable) {
    return {
      state: "verify",
      label: "Handshake · Verify",
      detail: "Handshake cannot reach the server, so this call is not confirmed.",
    };
  }
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