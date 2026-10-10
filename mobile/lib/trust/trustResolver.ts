/**
 * Trusted-circle resolver — two layers.
 *
 * Layer 1, `classifyTrust`, answers "how much do we actually know about who
 * this is?" and returns exactly one of five outcomes. Layer 2,
 * `resolveAnalysisPlan`, turns that classification plus the audio situation
 * into a single action, and enforces the product rule: **when the counterpart
 * is confirmed trusted, real-time risk analysis is skipped.**
 *
 * Trust here is device/session trust, not caller-ID. `StoredPair` holds no
 * phone number; a call is "trusted" only when a server-confirmed mutual session
 * for some stored pair also passed local attestation verification on this
 * device. Call activity alone, a cached label, or a server claim whose
 * attestation this device could not verify, are never enough.
 *
 * The five trust outcomes:
 *
 *   TRUSTED               — server-confirmed AND locally verified attestation.
 *   PARTIALLY_TRUSTED     — server says confirmed but local attestation failed
 *                           (inconsistent evidence; treat as not-safe).
 *   TRUST_RELATION_INVALID— a relation exists but is not valid now (revoked,
 *                           expired, or the proof was rejected).
 *   IDENTITY_UNAVAILABLE  — trust could not be evaluated (backend unreachable,
 *                           no call, or no identifying signal).
 *   UNKNOWN_IDENTITY      — relations exist but none confirmed this call (e.g.
 *                           the peer never joined, or no pair matches).
 *
 * Pure and total: every input maps to exactly one classification and one plan.
 */

import type { AudioSourceKind, SourceDecision } from "../audio/sourceManager";

/* ------------------------------------------------------------------ */
/* Layer 1 — trust classification                                       */
/* ------------------------------------------------------------------ */

export interface SessionEvidence {
  serverConfirmed: boolean;
  attestationVerified: boolean;
}

/**
 * Why a session, if one was attempted, did not yield full trust. The kind
 * matters: it is what separates "invalid relation" from "could not evaluate"
 * from "unknown identity".
 */
export type TrustFailure =
  | { kind: "network" } // transport failure → backend unreachable
  | { kind: "revoked" } // device or relation revoked
  | { kind: "expired" } // session expired
  | { kind: "proof_rejected" } // invalid proof / nonce replay / attestation mismatch
  | { kind: "timeout" } // peer never joined before the deadline
  | { kind: "no_pairs" }; // no trusted circle on this device

export interface TrustClassifyInput {
  callActive: boolean;
  /** Evidence from a completed session attempt, or null when none completed. */
  evidence: SessionEvidence | null;
  /** The reason trust was not reached, when a session was attempted. */
  failure?: TrustFailure;
}

export type TrustClassification =
  | "TRUSTED"
  | "PARTIALLY_TRUSTED"
  | "TRUST_RELATION_INVALID"
  | "IDENTITY_UNAVAILABLE"
  | "UNKNOWN_IDENTITY";

/** Classifies how much is actually known about the counterpart. */
export function classifyTrust(input: TrustClassifyInput): TrustClassification {
  // No call in progress — there is no counterpart to classify.
  if (!input.callActive) return "IDENTITY_UNAVAILABLE";

  const evidence = input.evidence;
  if (evidence) {
    if (evidence.serverConfirmed && evidence.attestationVerified) return "TRUSTED";
    // Server confirmed but this device could not verify the attestation. That
    // inconsistency is a reason to be cautious, not to trust.
    if (evidence.serverConfirmed && !evidence.attestationVerified) return "PARTIALLY_TRUSTED";
    // Anything less than a server confirmation is not trust evidence at all.
  }

  const failure = input.failure;
  if (failure) {
    switch (failure.kind) {
      case "network":
        return "IDENTITY_UNAVAILABLE";
      case "revoked":
      case "expired":
      case "proof_rejected":
        return "TRUST_RELATION_INVALID";
      case "timeout":
      case "no_pairs":
        return "UNKNOWN_IDENTITY";
    }
  }

  // No evidence and no recorded failure: nothing was learned about this call.
  return "UNKNOWN_IDENTITY";
}

/* ------------------------------------------------------------------ */
/* Layer 2 — analysis plan                                              */
/* ------------------------------------------------------------------ */

export type AnalysisPlan =
  /** Confirmed trusted counterpart → real-time risk analysis is skipped. */
  | { action: "SKIP_TRUSTED"; reason: string }
  /** Not trusted; an attributable remote source exists → run the pipeline. */
  | { action: "RUN_REMOTE_ANALYSIS"; source: AudioSourceKind; reason: string }
  /** Not trusted; only mixed microphone audio → surface, do not analyse as remote. */
  | { action: "SURFACE_NO_REMOTE_AUDIO"; detail: string }
  /** Not trusted; no usable audio → surface the honest limitation. */
  | { action: "SURFACE_AUDIO_UNAVAILABLE"; detail: string }
  /** Not trusted; trust itself is unresolved → surface why. */
  | { action: "SURFACE_UNVERIFIABLE"; detail: string };

export interface AnalysisPlanInput {
  classification: TrustClassification;
  /** The audio source decision, when one was attempted. */
  source: SourceDecision | null;
}

/**
 * Turns a trust classification plus the audio situation into one action.
 *
 * A `TRUSTED` classification short-circuits to `SKIP_TRUSTED` without consulting
 * audio — risk analysis is deliberately skipped for confirmed trusted relations.
 * Every other classification falls through to the audio gating, because an
 * untrusted call is exactly the case real-time analysis exists for.
 */
export function resolveAnalysisPlan(input: AnalysisPlanInput): AnalysisPlan {
  if (input.classification === "TRUSTED") {
    return {
      action: "SKIP_TRUSTED",
      reason:
        "Both phones confirmed this trusted relationship, so real-time risk analysis is skipped.",
    };
  }

  // Surface exactly why trust was not reached, before considering audio.
  if (input.classification === "TRUST_RELATION_INVALID") {
    return {
      action: "SURFACE_UNVERIFIABLE",
      detail: "This phone's trust for this person is no longer valid.",
    };
  }
  if (input.classification === "IDENTITY_UNAVAILABLE") {
    return {
      action: "SURFACE_UNVERIFIABLE",
      detail: "Cannot confirm this call right now.",
    };
  }

  // PARTIALLY_TRUSTED and UNKNOWN_IDENTITY both mean "not confirmed" — proceed
  // to audio. PARTIALLY_TRUSTED is deliberately not skipped: inconsistent
  // evidence is a reason to look closer, not to relax.
  const source = input.source;
  if (!source) {
    return {
      action: "SURFACE_AUDIO_UNAVAILABLE",
      detail: "Handshake cannot access this call's audio for analysis.",
    };
  }

  switch (source.outcome) {
    case "SELECTED":
      return {
        action: "RUN_REMOTE_ANALYSIS",
        source: source.source,
        reason:
          "Analysing the other party's speech for pressure tactics. This is not a " +
          "confirmed trusted contact, so the call is being checked.",
      };
    case "REMOTE_SPEECH_NOT_ISOLATED":
      return {
        action: "SURFACE_NO_REMOTE_AUDIO",
        detail: source.explanation,
      };
    case "AUDIO_UNAVAILABLE":
      return {
        action: "SURFACE_AUDIO_UNAVAILABLE",
        detail: "Handshake cannot access this call's audio for analysis.",
      };
  }
}
