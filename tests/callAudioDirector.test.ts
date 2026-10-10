/**
 * Call audio director tests.
 *
 * The guarantees under test: the director only ever produces audio-derived
 * states, it never emits a trust/risk verdict, and only the two audio-limitation
 * states are flagged as publishable (so a healthy analysis state is never
 * mistaken for a limitation, and a limitation is never hidden).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateCallAudio,
  isAudioLimitationState,
  type ProbeFn,
} from "../mobile/lib/audio/callAudioDirector";
import type { NativeProbeReport } from "../mobile/lib/audio/sourceManager";

const HEALTHY_MIC: NativeProbeReport = {
  audioMode: "MODE_IN_COMMUNICATION",
  accessibilityCaptureAvailable: false,
  candidates: [
    {
      kind: "privileged_downlink",
      declared: true,
      granted: { status: "denied", evidence: "SecurityException" },
      opened: { status: "not_attempted" },
      silenced: false,
      measuredRms: 0,
      containsRemoteVoice: { status: "not_attempted" },
    },
    {
      kind: "ordinary_mic",
      declared: true,
      granted: { status: "ok" },
      opened: { status: "ok" },
      silenced: false,
      measuredRms: 0.15,
      containsRemoteVoice: { status: "failed", evidence: "mixture" },
    },
  ],
};

const SILENCED_MIC: NativeProbeReport = {
  audioMode: "MODE_IN_COMMUNICATION",
  accessibilityCaptureAvailable: false,
  candidates: [
    {
      kind: "ordinary_mic",
      declared: true,
      granted: { status: "ok" },
      opened: { status: "ok" },
      silenced: true,
      measuredRms: 0,
      containsRemoteVoice: { status: "failed", evidence: "mixture" },
    },
  ],
};

const USABLE_DOWNLINK: NativeProbeReport = {
  audioMode: "MODE_IN_CALL",
  accessibilityCaptureAvailable: false,
  candidates: [
    {
      kind: "privileged_downlink",
      declared: true,
      granted: { status: "ok" },
      opened: { status: "ok" },
      silenced: false,
      measuredRms: 0.3,
      containsRemoteVoice: { status: "ok" },
    },
  ],
};

function probeReturning(report: NativeProbeReport): ProbeFn {
  return async () => report;
}

describe("evaluateCallAudio", () => {
  test("a healthy mixed microphone surfaces needs_review, not analysis", async () => {
    const evaluation = await evaluateCallAudio(probeReturning(HEALTHY_MIC));
    assert.equal(evaluation.decision.outcome, "REMOTE_SPEECH_NOT_ISOLATED");
    assert.equal(evaluation.state, "needs_review");
  });

  test("a silenced microphone surfaces capture_unavailable", async () => {
    const evaluation = await evaluateCallAudio(probeReturning(SILENCED_MIC));
    assert.equal(evaluation.state, "capture_unavailable");
  });

  test("an empty (probe unavailable) report surfaces capture_unavailable", async () => {
    const evaluation = await evaluateCallAudio(probeReturning({ audioMode: "unavailable", accessibilityCaptureAvailable: false, candidates: [] }));
    assert.equal(evaluation.state, "capture_unavailable");
  });

  test("a usable downlink surfaces analyzing", async () => {
    const evaluation = await evaluateCallAudio(probeReturning(USABLE_DOWNLINK));
    assert.equal(evaluation.decision.outcome, "SELECTED");
    assert.equal(evaluation.state, "analyzing");
  });

  test("a rejecting probe degrades to capture_unavailable, never throws", async () => {
    const failing: ProbeFn = async () => {
      throw new Error("native missing");
    };
    const evaluation = await evaluateCallAudio(failing);
    assert.equal(evaluation.state, "capture_unavailable");
    assert.notEqual(evaluation.state, "trusted");
  });

  test("never emits a trust or risk verdict for any input", async () => {
    for (const report of [HEALTHY_MIC, SILENCED_MIC, USABLE_DOWNLINK]) {
      const evaluation = await evaluateCallAudio(probeReturning(report));
      assert.notEqual(evaluation.state, "trusted");
      assert.notEqual(evaluation.state, "risk");
      assert.notEqual(evaluation.state, "verify");
    }
  });
});

describe("isAudioLimitationState", () => {
  test("flags only the limitation states as publishable", () => {
    assert.equal(isAudioLimitationState("capture_unavailable"), true);
    assert.equal(isAudioLimitationState("needs_review"), true);
    assert.equal(isAudioLimitationState("analyzing"), false);
  });
});
