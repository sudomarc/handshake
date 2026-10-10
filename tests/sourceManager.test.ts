/**
 * Audio Source Manager tests.
 *
 * The core guarantee under test: the four access stages are never conflated.
 * Stages 1–3 (declared / granted / opened) must never be presented as stage 4
 * (contains the remote party's voice). A microphone that opens and is not
 * silenced still fails stage 4, because it captures a local+remote mixture.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  selectAudioSource,
  analysisStateForDecision,
  SOURCE_PRIORITY,
  type CandidateReport,
  type NativeProbeReport,
  type StageResult,
} from "../mobile/lib/audio/sourceManager";

const OK: StageResult = { status: "ok" };
const DENIED: StageResult = { status: "denied", evidence: "SecurityException" };

function downlink(overrides: Partial<CandidateReport> = {}): CandidateReport {
  return {
    kind: "privileged_downlink",
    declared: true,
    granted: DENIED,
    opened: { status: "not_attempted" },
    silenced: false,
    measuredRms: 0,
    containsRemoteVoice: { status: "not_attempted" },
    ...overrides,
  };
}

function mic(
  kind: "accessibility_mic" | "ordinary_mic",
  overrides: Partial<CandidateReport> = {},
): CandidateReport {
  return {
    kind,
    declared: true,
    granted: OK,
    opened: OK,
    silenced: false,
    measuredRms: 0.1,
    containsRemoteVoice: {
      status: "failed",
      evidence: "mixture of local and remote",
    },
    ...overrides,
  };
}

function report(candidates: CandidateReport[], extra: Partial<NativeProbeReport> = {}): NativeProbeReport {
  return {
    audioMode: "MODE_IN_COMMUNICATION",
    accessibilityCaptureAvailable: false,
    candidates,
    ...extra,
  };
}

describe("selectAudioSource", () => {
  test("priority order is privileged downlink first, then accessibility, then ordinary mic", () => {
    assert.deepEqual(SOURCE_PRIORITY, [
      "privileged_downlink",
      "accessibility_mic",
      "ordinary_mic",
    ]);
  });

  test("a granted, opened downlink source with attributable remote voice is SELECTED", () => {
    const decision = selectAudioSource(
      report([
        downlink({
          granted: OK,
          opened: OK,
          containsRemoteVoice: OK,
          measuredRms: 0.3,
        }),
      ]),
    );
    assert.equal(decision.outcome, "SELECTED");
    if (decision.outcome === "SELECTED") {
      assert.equal(decision.source, "privileged_downlink");
      assert.equal(decision.attributableToRemote, true);
    }
  });

  test("a denied downlink (normal app, no CAPTURE_AUDIO_OUTPUT) is skipped, not fatal", () => {
    const decision = selectAudioSource(
      report([downlink(), mic("ordinary_mic")]),
    );
    // Downlink denied → falls through to the ordinary mic, which is a mixture.
    assert.equal(decision.outcome, "REMOTE_SPEECH_NOT_ISOLATED");
  });

  test("a usable microphone is NEVER selected as remote-only audio (stage 4 fails)", () => {
    const decision = selectAudioSource(
      report([downlink(), mic("ordinary_mic")]),
    );
    assert.equal(decision.outcome, "REMOTE_SPEECH_NOT_ISOLATED");
    if (decision.outcome === "REMOTE_SPEECH_NOT_ISOLATED") {
      assert.equal(decision.bestMicrophone, "ordinary_mic");
      assert.match(decision.explanation, /mixture|mixed/i);
    }
  });

  test("a silenced microphone is treated as unusable (opened but silenced ≠ usable)", () => {
    const decision = selectAudioSource(
      report([downlink(), mic("ordinary_mic", { silenced: true })]),
    );
    assert.equal(decision.outcome, "AUDIO_UNAVAILABLE");
    if (decision.outcome === "AUDIO_UNAVAILABLE") {
      assert.ok(decision.attempts.includes("ordinary_mic"));
    }
  });

  test("accessibility mic is preferred over ordinary mic when both open", () => {
    const decision = selectAudioSource(
      report([
        downlink(),
        mic("accessibility_mic"),
        mic("ordinary_mic"),
      ]),
    );
    assert.equal(decision.outcome, "REMOTE_SPEECH_NOT_ISOLATED");
    if (decision.outcome === "REMOTE_SPEECH_NOT_ISOLATED") {
      assert.equal(decision.bestMicrophone, "accessibility_mic");
    }
  });

  test("an undeclared source is not attempted at all", () => {
    const decision = selectAudioSource(
      report([
        downlink({ declared: false, granted: OK, opened: OK, containsRemoteVoice: OK }),
        mic("ordinary_mic", { silenced: true }),
      ]),
    );
    assert.equal(decision.outcome, "AUDIO_UNAVAILABLE");
    if (decision.outcome === "AUDIO_UNAVAILABLE") {
      assert.equal(decision.attempts.includes("privileged_downlink"), false);
    }
  });

  test("no declared sources yields AUDIO_UNAVAILABLE with an honest reason", () => {
    const decision = selectAudioSource(report([]));
    assert.equal(decision.outcome, "AUDIO_UNAVAILABLE");
    if (decision.outcome === "AUDIO_UNAVAILABLE") {
      assert.match(decision.reason, /no audio source/i);
    }
  });

  test("permission-denied microphone (RECORD_AUDIO not granted) is AUDIO_UNAVAILABLE", () => {
    const decision = selectAudioSource(
      report([downlink(), mic("ordinary_mic", { granted: DENIED, opened: { status: "not_attempted" } })]),
    );
    assert.equal(decision.outcome, "AUDIO_UNAVAILABLE");
  });
});

describe("analysisStateForDecision", () => {
  test("SELECTED maps to the analyzing state", () => {
    const decision = selectAudioSource(
      report([downlink({ granted: OK, opened: OK, containsRemoteVoice: OK })]),
    );
    const state = analysisStateForDecision(decision);
    assert.equal(state.state, "analyzing");
  });

  test("REMOTE_SPEECH_NOT_ISOLATED maps to needs_review and never claims remote analysis", () => {
    const decision = selectAudioSource(report([downlink(), mic("ordinary_mic")]));
    const state = analysisStateForDecision(decision);
    assert.equal(state.state, "needs_review");
    assert.doesNotMatch(state.detail, /protected/i);
  });

  test("AUDIO_UNAVAILABLE maps to capture_unavailable", () => {
    const decision = selectAudioSource(report([]));
    const state = analysisStateForDecision(decision);
    assert.equal(state.state, "capture_unavailable");
  });

  test("no produced detail ever claims 'Protected'", () => {
    const decisions = [
      selectAudioSource(report([])),
      selectAudioSource(report([downlink(), mic("ordinary_mic")])),
      selectAudioSource(report([downlink({ granted: OK, opened: OK, containsRemoteVoice: OK })])),
    ];
    for (const d of decisions) {
      assert.doesNotMatch(analysisStateForDecision(d).detail, /protected/i);
    }
  });
});
