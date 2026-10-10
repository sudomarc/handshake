/**
 * Probe adapter tests — the stage-4 attribution rule and native→model mapping.
 *
 * The guarantee under test: a microphone that looks perfectly healthy in stages
 * 1–3 still never reports stage 4 (`containsRemoteVoice`) as `ok`, and feeding
 * such an adapted report into `selectAudioSource` therefore yields
 * `REMOTE_SPEECH_NOT_ISOLATED`, never a selected remote source.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  adaptCandidate,
  adaptReport,
  attributeRemoteVoice,
  EMPTY_PROBE_REPORT,
} from "../mobile/lib/audio/probeAdapter";
import { selectAudioSource } from "../mobile/lib/audio/sourceManager";

describe("attributeRemoteVoice", () => {
  test("a healthy microphone is never attributed to the remote party alone", () => {
    for (const kind of ["ordinary_mic", "accessibility_mic"]) {
      const result = attributeRemoteVoice({ kind, granted: true, opened: true, silenced: false });
      assert.equal(result.status, "failed", `${kind} must not pass stage 4`);
    }
  });

  test("a granted, opened, un-silenced downlink IS attributed to the remote party", () => {
    const result = attributeRemoteVoice({
      kind: "privileged_downlink",
      granted: true,
      opened: true,
      silenced: false,
    });
    assert.equal(result.status, "ok");
  });

  test("a silenced downlink is not attributed", () => {
    const result = attributeRemoteVoice({
      kind: "privileged_downlink",
      granted: true,
      opened: true,
      silenced: true,
    });
    assert.notEqual(result.status, "ok");
  });

  test("a downlink that never opened is not attributed", () => {
    const result = attributeRemoteVoice({
      kind: "privileged_downlink",
      granted: true,
      opened: false,
      silenced: false,
    });
    assert.notEqual(result.status, "ok");
  });
});

describe("adaptCandidate", () => {
  test("drops unknown candidate kinds rather than guessing", () => {
    assert.equal(adaptCandidate({ kind: "mystery_source" }), null);
    assert.equal(adaptCandidate({ kind: "" }), null);
  });

  test("maps a SecurityException-deniable downlink to a denied stage 2", () => {
    const c = adaptCandidate({
      kind: "privileged_downlink",
      declared: true,
      granted: false,
      grantedEvidence: "SecurityException: CAPTURE_AUDIO_OUTPUT",
      opened: false,
      error: "SecurityException",
    });
    assert.equal(c!.granted.status, "denied");
    assert.match(c!.granted.evidence ?? "", /SecurityException/);
  });

  test("maps a healthy mic to opened + not-silenced but failed stage 4", () => {
    const c = adaptCandidate({
      kind: "ordinary_mic",
      granted: true,
      opened: true,
      silenced: false,
      measuredRms: 0.12,
    });
    assert.equal(c!.opened.status, "ok");
    assert.equal(c!.silenced, false);
    assert.equal(c!.measuredRms, 0.12);
    assert.equal(c!.containsRemoteVoice.status, "failed");
  });
});

describe("adaptReport + selectAudioSource integration", () => {
  test("a native report with only a healthy mic selects no remote source", () => {
    const report = adaptReport({
      audioMode: "MODE_IN_COMMUNICATION",
      accessibilityCaptureAvailable: false,
      candidates: [
        {
          kind: "privileged_downlink",
          granted: false,
          grantedEvidence: "SecurityException",
          opened: false,
          error: "SecurityException",
        },
        { kind: "ordinary_mic", granted: true, opened: true, silenced: false, measuredRms: 0.2 },
      ],
    });
    const decision = selectAudioSource(report);
    assert.equal(decision.outcome, "REMOTE_SPEECH_NOT_ISOLATED");
  });

  test("a native report with a usable downlink selects it", () => {
    const report = adaptReport({
      audioMode: "MODE_IN_CALL",
      candidates: [
        {
          kind: "privileged_downlink",
          granted: true,
          opened: true,
          silenced: false,
          measuredRms: 0.3,
        },
      ],
    });
    const decision = selectAudioSource(report);
    assert.equal(decision.outcome, "SELECTED");
  });

  test("a silenced mic alone is audio-unavailable", () => {
    const report = adaptReport({
      audioMode: "MODE_IN_COMMUNICATION",
      candidates: [
        { kind: "ordinary_mic", granted: true, opened: true, silenced: true, measuredRms: 0 },
      ],
    });
    assert.equal(selectAudioSource(report).outcome, "AUDIO_UNAVAILABLE");
  });

  test("empty report (probe unavailable) is audio-unavailable", () => {
    assert.equal(selectAudioSource(EMPTY_PROBE_REPORT).outcome, "AUDIO_UNAVAILABLE");
  });
});
