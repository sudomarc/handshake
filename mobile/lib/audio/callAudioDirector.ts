/**
 * Call audio director — the glue that runs the native probe for a live call and
 * turns it into the honest audio state for that call.
 *
 * It deliberately owns only the *audio* dimension. Trust and risk verdicts
 * belong to the trust cycle (`orchestrator.ts`), which the caller runs first.
 * The director is therefore only ever consulted to refine a call that did NOT
 * already resolve to `trusted` or `risk`, and it only ever produces the two
 * audio-limitation states:
 *
 *   capture_unavailable — no usable audio at all (probe found nothing).
 *   needs_review        — a microphone captured audio, but it is a local+remote
 *                         mixture, so Handshake will not analyse it as if it
 *                         were only the other party.
 *
 * It can never emit `trusted`, `risk`, or a false "Protected". This is the seam
 * that keeps the honest four-stage rules of `sourceManager.ts` attached to the
 * real device, without letting audio quietly fabricate a trust claim.
 */

import {
  selectAudioSource,
  analysisStateForDecision,
  type NativeProbeReport,
  type SourceDecision,
} from "./sourceManager";

export interface AudioEvaluation {
  decision: SourceDecision;
  /** The honest in-call state derived from the decision. */
  state: "capture_unavailable" | "needs_review" | "analyzing";
  detail: string;
  /** The raw probe report, for diagnostics. */
  report: NativeProbeReport;
}

export type ProbeFn = () => Promise<NativeProbeReport>;

/**
 * Runs the probe and derives the honest audio state for the current call.
 *
 * The probe is a required parameter (callers pass `runAudioProbe` from
 * `nativeProbe.ts`), which keeps this module free of any React Native import so
 * it stays unit-testable in Node. A probe that throws or is unavailable
 * degrades to an "empty" report, which the four-stage rules turn into
 * `capture_unavailable` — an honest "nothing usable" rather than an exception or
 * a fabricated capability.
 */
export async function evaluateCallAudio(probe: ProbeFn): Promise<AudioEvaluation> {
  let report: NativeProbeReport;
  try {
    report = await probe();
  } catch {
    report = { audioMode: "unavailable", accessibilityCaptureAvailable: false, candidates: [] };
  }
  const decision = selectAudioSource(report);
  const { state, detail } = analysisStateForDecision(decision);
  return { decision, state, detail, report };
}

/** States the director is allowed to publish. Verdict states are off-limits. */
export function isAudioLimitationState(
  state: AudioEvaluation["state"],
): state is "capture_unavailable" | "needs_review" {
  return state === "capture_unavailable" || state === "needs_review";
}
