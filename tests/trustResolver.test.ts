/**
 * Trusted-circle resolver tests.
 *
 * Two guarantees under test:
 *   1. trust classification returns exactly one of five outcomes and never
 *      promotes inconsistent or unverified evidence to TRUSTED;
 *   2. risk analysis is skipped only for a confirmed trusted counterpart, and
 *      never for PARTIALLY_TRUSTED / UNKNOWN_IDENTITY / invalid / unavailable.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyTrust,
  resolveAnalysisPlan,
} from "../mobile/lib/trust/trustResolver";
import type { SourceDecision } from "../mobile/lib/audio/sourceManager";

const SELECTED_REMOTE: SourceDecision = {
  outcome: "SELECTED",
  source: "privileged_downlink",
  attributableToRemote: true,
  report: {
    kind: "privileged_downlink",
    declared: true,
    granted: { status: "ok" },
    opened: { status: "ok" },
    silenced: false,
    measuredRms: 0.2,
    containsRemoteVoice: { status: "ok" },
  },
};

const MIC_MIXED: SourceDecision = {
  outcome: "REMOTE_SPEECH_NOT_ISOLATED",
  bestMicrophone: "ordinary_mic",
  blockedBy: { status: "failed", evidence: "mixture" },
  explanation: "Microphone audio mixes both sides; remote voice cannot be isolated.",
};

const NO_AUDIO: SourceDecision = {
  outcome: "AUDIO_UNAVAILABLE",
  reason: "blocked",
  attempts: ["ordinary_mic"],
};

describe("classifyTrust", () => {
  test("server-confirmed and locally verified → TRUSTED", () => {
    const c = classifyTrust({
      callActive: true,
      evidence: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(c, "TRUSTED");
  });

  test("server confirmed but attestation NOT verified → PARTIALLY_TRUSTED (never TRUSTED)", () => {
    const c = classifyTrust({
      callActive: true,
      evidence: { serverConfirmed: true, attestationVerified: false },
    });
    assert.equal(c, "PARTIALLY_TRUSTED");
    assert.notEqual(c, "TRUSTED");
  });

  test("revoked relation → TRUST_RELATION_INVALID", () => {
    const c = classifyTrust({ callActive: true, evidence: null, failure: { kind: "revoked" } });
    assert.equal(c, "TRUST_RELATION_INVALID");
  });

  test("expired session → TRUST_RELATION_INVALID", () => {
    const c = classifyTrust({ callActive: true, evidence: null, failure: { kind: "expired" } });
    assert.equal(c, "TRUST_RELATION_INVALID");
  });

  test("rejected proof → TRUST_RELATION_INVALID", () => {
    const c = classifyTrust({
      callActive: true,
      evidence: null,
      failure: { kind: "proof_rejected" },
    });
    assert.equal(c, "TRUST_RELATION_INVALID");
  });

  test("network failure → IDENTITY_UNAVAILABLE (cannot evaluate, not a mismatch)", () => {
    const c = classifyTrust({ callActive: true, evidence: null, failure: { kind: "network" } });
    assert.equal(c, "IDENTITY_UNAVAILABLE");
  });

  test("no call active → IDENTITY_UNAVAILABLE", () => {
    const c = classifyTrust({ callActive: false, evidence: null });
    assert.equal(c, "IDENTITY_UNAVAILABLE");
  });

  test("peer timed out (never joined) → UNKNOWN_IDENTITY", () => {
    const c = classifyTrust({ callActive: true, evidence: null, failure: { kind: "timeout" } });
    assert.equal(c, "UNKNOWN_IDENTITY");
  });

  test("no trusted circle → UNKNOWN_IDENTITY", () => {
    const c = classifyTrust({ callActive: true, evidence: null, failure: { kind: "no_pairs" } });
    assert.equal(c, "UNKNOWN_IDENTITY");
  });

  test("no evidence and no failure → UNKNOWN_IDENTITY", () => {
    const c = classifyTrust({ callActive: true, evidence: null });
    assert.equal(c, "UNKNOWN_IDENTITY");
  });
});

describe("resolveAnalysisPlan", () => {
  test("TRUSTED skips risk analysis regardless of audio", () => {
    for (const source of [SELECTED_REMOTE, MIC_MIXED, NO_AUDIO, null]) {
      const plan = resolveAnalysisPlan({ classification: "TRUSTED", source });
      assert.equal(plan.action, "SKIP_TRUSTED");
    }
  });

  test("PARTIALLY_TRUSTED does NOT skip analysis (inconsistent evidence is not safety)", () => {
    const plan = resolveAnalysisPlan({ classification: "PARTIALLY_TRUSTED", source: SELECTED_REMOTE });
    assert.equal(plan.action, "RUN_REMOTE_ANALYSIS");
  });

  test("UNKNOWN_IDENTITY with an attributable remote source runs analysis", () => {
    const plan = resolveAnalysisPlan({ classification: "UNKNOWN_IDENTITY", source: SELECTED_REMOTE });
    assert.equal(plan.action, "RUN_REMOTE_ANALYSIS");
  });

  test("UNKNOWN_IDENTITY with only mixed mic audio surfaces, never analyses as remote", () => {
    const plan = resolveAnalysisPlan({ classification: "UNKNOWN_IDENTITY", source: MIC_MIXED });
    assert.equal(plan.action, "SURFACE_NO_REMOTE_AUDIO");
  });

  test("UNKNOWN_IDENTITY with no audio surfaces audio-unavailable", () => {
    const plan = resolveAnalysisPlan({ classification: "UNKNOWN_IDENTITY", source: NO_AUDIO });
    assert.equal(plan.action, "SURFACE_AUDIO_UNAVAILABLE");
  });

  test("UNKNOWN_IDENTITY with no source attempted surfaces audio-unavailable", () => {
    const plan = resolveAnalysisPlan({ classification: "UNKNOWN_IDENTITY", source: null });
    assert.equal(plan.action, "SURFACE_AUDIO_UNAVAILABLE");
  });

  test("TRUST_RELATION_INVALID surfaces unverifiable without consulting audio", () => {
    const plan = resolveAnalysisPlan({ classification: "TRUST_RELATION_INVALID", source: SELECTED_REMOTE });
    assert.equal(plan.action, "SURFACE_UNVERIFIABLE");
  });

  test("IDENTITY_UNAVAILABLE surfaces unverifiable", () => {
    const plan = resolveAnalysisPlan({ classification: "IDENTITY_UNAVAILABLE", source: null });
    assert.equal(plan.action, "SURFACE_UNVERIFIABLE");
  });

  test("no plan detail ever claims 'Protected'", () => {
    const inputs: AnalysisPlanInputLike[] = [
      { classification: "TRUSTED", source: null },
      { classification: "UNKNOWN_IDENTITY", source: MIC_MIXED },
      { classification: "UNKNOWN_IDENTITY", source: NO_AUDIO },
      { classification: "TRUST_RELATION_INVALID", source: null },
      { classification: "IDENTITY_UNAVAILABLE", source: null },
    ];
    for (const input of inputs) {
      const plan = resolveAnalysisPlan(input);
      const text = "reason" in plan ? plan.reason : plan.detail;
      assert.doesNotMatch(text, /protected/i);
    }
  });
});

type AnalysisPlanInputLike = Parameters<typeof resolveAnalysisPlan>[0];
