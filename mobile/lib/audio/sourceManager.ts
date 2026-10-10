/**
 * Audio Source Manager — decides *which* audio, if any, may be fed to the risk
 * pipeline for a live call, and reports honestly when the answer is "none".
 *
 * The four access stages are kept strictly separate, per the research doc
 * (`docs/ANDROID_AUDIO_RESEARCH.md`). A path is only useful for remote analysis
 * when stage 4 holds:
 *
 *   1. DECLARED              — the source constant is available and the code
 *                              attempts it on this API level (the probe reports
 *                              this per candidate; a constant the platform does
 *                              not expose reports `false`).
 *   2. GRANTED               — the runtime permission is actually granted.
 *   3. OPENED                — `AudioRecord.start()` succeeded and produced samples.
 *   4. CONTAINS REMOTE VOICE — the samples can be attributed to the *remote*
 *                              party alone (not a local/ambient mixture).
 *
 * Stages 1–3 must never be reported as stage 4. A microphone capture that is
 * *opened* and *not silenced* still fails stage 4 for remote attribution,
 * because the mic hears a mixture of the local user and whatever the speaker
 * plays back — Handshake cannot separate the remote voice from that mixture.
 * Only a genuine telephony downlink/uplink source (which requires the
 * system-only `CAPTURE_AUDIO_OUTPUT`) satisfies stage 4 on its own.
 *
 * This module is pure: it consumes a `NativeProbeReport` produced by the
 * platform layer (`AudioSourceProbe.kt`) and returns a decision. It never
 * touches the microphone itself, so it is fully unit-testable.
 */

/** Candidate sources, in the priority order the manager attempts them. */
export type AudioSourceKind =
  /** Pure telephony downlink/uplink. Stage 2 is impossible for a normal app. */
  | "privileged_downlink"
  /** Microphone captured under an accessibility service (capture-policy exempt). */
  | "accessibility_mic"
  /** Ordinary microphone captured under a microphone foreground service. */
  | "ordinary_mic";

/** Every candidate the platform layer can attempt, highest priority first. */
export const SOURCE_PRIORITY: readonly AudioSourceKind[] = [
  "privileged_downlink",
  "accessibility_mic",
  "ordinary_mic",
];

export type StageStatus =
  /** The stage succeeded. */
  | "ok"
  /** The stage was blocked (e.g. permission denied, SecurityException). */
  | "denied"
  /** The stage opened but the platform is silencing the returned audio. */
  | "silenced"
  /** The stage failed for another reason. */
  | "failed"
  /** This stage was not attempted (an earlier stage already failed). */
  | "not_attempted";

export interface StageResult {
  status: StageStatus;
  /** Human-readable, factual evidence (exception message, API result, …). */
  evidence?: string;
}

/**
 * What the platform layer measured for one candidate source.
 *
 * `containsRemoteVoice` reflects an *attribution* judgement: `ok` only when the
 * capture is, by construction, the remote party's audio (a downlink source). A
 * microphone is never `ok` here because it captures a mixture.
 */
export interface CandidateReport {
  kind: AudioSourceKind;
  declared: boolean;
  granted: StageResult;
  opened: StageResult;
  /** Whether the platform reported the client is being silenced right now. */
  silenced: boolean;
  /** Measured RMS energy of the first captured frames (0 when nothing captured). */
  measuredRms: number;
  /** Attribution: can these samples be treated as the remote party alone? */
  containsRemoteVoice: StageResult;
}

/** The full result of the platform probe for one call. */
export interface NativeProbeReport {
  /** `AudioManager.getMode()` at probe time, for diagnostics. */
  audioMode: string;
  /** True when the app currently runs as (or with) an accessibility service. */
  accessibilityCaptureAvailable: boolean;
  candidates: CandidateReport[];
}

export type SourceDecision =
  /** A source with attributable remote voice — safe to feed the risk pipeline. */
  | {
      outcome: "SELECTED";
      source: AudioSourceKind;
      report: CandidateReport;
      /** Always true for a selected source; kept explicit for auditing. */
      attributableToRemote: true;
    }
  /** A microphone is open and usable, but its audio is a local+remote mixture. */
  | {
      outcome: "REMOTE_SPEECH_NOT_ISOLATED";
      /** The best microphone candidate that opened, if any. */
      bestMicrophone: AudioSourceKind | null;
      /** The stage-4 failure that blocked attribution. */
      blockedBy: StageResult;
      explanation: string;
    }
  /** No candidate produced usable audio at all. */
  | {
      outcome: "AUDIO_UNAVAILABLE";
      reason: string;
      attempts: AudioSourceKind[];
    };

/**
 * Decides which source, if any, may be analysed, from a platform probe report.
 *
 * Priority: `privileged_downlink` → `accessibility_mic` → `ordinary_mic`. A
 * candidate is skipped when an earlier stage failed. Only a downlink source can
 * be SELECTED; microphones degrade to `REMOTE_SPEECH_NOT_ISOLATED` because their
 * audio cannot be attributed to the remote party alone.
 */
export function selectAudioSource(report: NativeProbeReport): SourceDecision {
  const attempts: AudioSourceKind[] = [];
  let bestMicrophone: AudioSourceKind | null = null;

  for (const kind of SOURCE_PRIORITY) {
    const candidate = report.candidates.find((c) => c.kind === kind);
    if (!candidate || !candidate.declared) continue;
    attempts.push(kind);

    // Stage 2: permission / signature check.
    if (candidate.granted.status !== "ok") continue;
    // Stage 3: the capture actually opened and returned non-silenced samples.
    if (candidate.opened.status !== "ok" || candidate.silenced) continue;

    // Stage 4: attribution. Only a genuine telephony downlink can be remote-only.
    // A microphone is refused here even if a malformed/future report claims
    // stage 4 `ok`: this is the enforcement point, so the honesty rule does not
    // depend solely on the adapter producing the report.
    if (kind === "privileged_downlink" && candidate.containsRemoteVoice.status === "ok") {
      return {
        outcome: "SELECTED",
        source: kind,
        report: candidate,
        attributableToRemote: true,
      };
    }

    // A usable microphone that cannot be attributed to the remote party alone.
    // It must also have produced a non-zero measured energy: `opened` without any
    // samples is digital silence, which is not "audio being captured".
    if (kind !== "privileged_downlink" && bestMicrophone === null && candidate.measuredRms > 0) {
      bestMicrophone = kind;
    }
  }

  if (bestMicrophone !== null) {
    const blockedBy: StageResult = {
      status: "failed",
      evidence:
        "Microphone audio is a mixture of the local user and whatever the call plays back; " +
        "Handshake cannot isolate the remote party's voice from it.",
    };
    return {
      outcome: "REMOTE_SPEECH_NOT_ISOLATED",
      bestMicrophone,
      blockedBy,
      explanation:
        "Call audio is being captured, but only through the microphone, so it contains " +
        "both sides mixed together. Handshake will not analyse it as if it were only the " +
        "other party. Remote-only analysis needs the telephony downlink, which a normal " +
        "app cannot obtain.",
    };
  }

  return {
    outcome: "AUDIO_UNAVAILABLE",
    reason:
      attempts.length === 0
        ? "No audio source was declared for this build."
        : "Every declared audio source was blocked or silenced before producing usable audio.",
    attempts,
  };
}

/**
 * Maps a source decision onto the honest in-call analysis state the overlay and
 * shield should surface. This is the only place that turns a technical outcome
 * into product copy, so the wording stays consistent and never overclaims.
 */
export function analysisStateForDecision(decision: SourceDecision): {
  state: "capture_unavailable" | "needs_review" | "analyzing";
  detail: string;
} {
  switch (decision.outcome) {
    case "SELECTED":
      return {
        state: "analyzing",
        detail: "Analysing the other party's speech for pressure tactics.",
      };
    case "REMOTE_SPEECH_NOT_ISOLATED":
      return {
        state: "needs_review",
        detail: decision.explanation,
      };
    case "AUDIO_UNAVAILABLE":
      return {
        state: "capture_unavailable",
        detail: "Handshake cannot access this call's audio for analysis.",
      };
  }
}
