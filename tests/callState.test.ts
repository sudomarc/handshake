/**
 * Call state machine unit tests.
 *
 * Exercises `deriveCallState` and `deriveOutsideCallState` from `mobile/lib/trust/callState.ts`.
 *
 * Invariants under test:
 *   1. Precedence: Risk detected outranks confirmed trust, in-flight analysis, or capture state.
 *   2. Zero phantom trust: Trusted status strictly requires both server confirmation AND local attestation verification.
 *   3. Progress states: Has trusted circle + authorized device advances honestly through initializing, capture_unavailable, analyzing, and verifying.
 *   4. Diagnostic fallbacks: Missing circle or revoked authorization maps honestly to verify states explaining the requirement.
 *   5. Honesty invariant: Neither in-call labels nor detail messages ever claim "Protected".
 *   6. Outside-call state: `ready` ("Protection ready") when reachable, `offline` when backend unreachable.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

const BASE_CONTEXT: CallContext = {
  callActive: true,
  hasTrustedCircle: true,
  deviceAuthorized: true,
  backendReachable: true,
  trust: null,
  riskDetected: false,
  audioAvailable: true,
  analysisInFlight: false,
};

describe("deriveCallState - Risk Precedence", () => {
  test("riskDetected outranks confirmed trust", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(decision.state, "risk");
    assert.equal(decision.label, "Handshake · Risk detected");
    assert.match(decision.detail, /pressure tactics/i);
  });

  test("riskDetected outranks in-flight analysis and audio availability", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      riskDetected: true,
      analysisInFlight: true,
      audioAvailable: true,
    });
    assert.equal(decision.state, "risk");
  });

  test("riskDetected outranks inactive call (outside call edge case)", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      callActive: false,
      riskDetected: true,
    });
    assert.equal(decision.state, "risk");
  });
});

describe("deriveCallState - Outside Call State", () => {
  test("inactive call returns verify / ready state", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      callActive: false,
      riskDetected: false,
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
    assert.equal(decision.detail, "Handshake is watching for calls.");
  });
});

describe("deriveCallState - Trust Verification Invariants", () => {
  test("both serverConfirmed AND attestationVerified → trusted", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(decision.state, "trusted");
    assert.equal(decision.label, "Handshake · Trusted connection");
    assert.equal(decision.detail, "Both phones confirmed the same trusted relationship.");
  });

  test("serverConfirmed=true but attestationVerified=false does NOT yield trusted", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: false },
      analysisInFlight: true,
    });
    assert.notEqual(decision.state, "trusted");
    assert.equal(decision.state, "verifying");
    assert.equal(decision.label, "Handshake · Verifying…");
  });

  test("serverConfirmed=false but attestationVerified=true does NOT yield trusted", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: false, attestationVerified: true },
      analysisInFlight: true,
    });
    assert.notEqual(decision.state, "trusted");
    assert.equal(decision.state, "analyzing");
  });

  test("trust=null does NOT yield trusted", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      trust: null,
    });
    assert.notEqual(decision.state, "trusted");
  });
});

describe("deriveCallState - Active In-Call Progress States", () => {
  test("offline backend returns offline state", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      backendReachable: false,
    });
    assert.equal(decision.state, "offline");
    assert.equal(decision.label, "Handshake · Offline");
    assert.match(decision.detail, /cannot reach server/i);
  });

  test("audio unavailable returns capture_unavailable", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      audioAvailable: false,
    });
    assert.equal(decision.state, "capture_unavailable");
    assert.equal(decision.label, "Handshake · Unable to verify");
    assert.match(decision.detail, /audio cannot be accessed/i);
  });

  test("analysis in flight without server confirmation returns analyzing", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      analysisInFlight: true,
      trust: null,
    });
    assert.equal(decision.state, "analyzing");
    assert.equal(decision.label, "Handshake · Analyzing…");
    assert.match(decision.detail, /evaluating trust signals/i);
  });

  test("analysis in flight with server confirmation returns verifying", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.equal(decision.state, "verifying");
    assert.equal(decision.label, "Handshake · Verifying…");
    assert.match(decision.detail, /confirming both phones/i);
  });

  test("ready to start analysis returns initializing", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      analysisInFlight: false,
      trust: null,
    });
    assert.equal(decision.state, "initializing");
    assert.equal(decision.label, "Handshake · Initializing…");
    assert.match(decision.detail, /preparing to verify/i);
  });
});

describe("deriveCallState - Fallbacks & Honest Copy", () => {
  test("missing trusted circle returns verify with pairing prompt", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      hasTrustedCircle: false,
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /add a trusted person before the call/i);
  });

  test("revoked device returns verify with revocation explanation", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      deviceAuthorized: false,
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /trust for this person was revoked/i);
  });

  test("in-call labels and details never claim 'Protected'", () => {
    const scenarios: CallContext[] = [
      BASE_CONTEXT,
      { ...BASE_CONTEXT, riskDetected: true },
      { ...BASE_CONTEXT, trust: { serverConfirmed: true, attestationVerified: true } },
      { ...BASE_CONTEXT, backendReachable: false },
      { ...BASE_CONTEXT, audioAvailable: false },
      { ...BASE_CONTEXT, analysisInFlight: true },
      {
        ...BASE_CONTEXT,
        analysisInFlight: true,
        trust: { serverConfirmed: true, attestationVerified: false },
      },
      { ...BASE_CONTEXT, hasTrustedCircle: false },
      { ...BASE_CONTEXT, deviceAuthorized: false },
      { ...BASE_CONTEXT, hasTrustedCircle: false, deviceAuthorized: false },
    ];

    for (const ctx of scenarios) {
      const decision = deriveCallState(ctx);
      assert.doesNotMatch(
        decision.label,
        /\bprotected\b/i,
        `Label '${decision.label}' must not claim protected`,
      );
      assert.doesNotMatch(
        decision.detail,
        /\bprotected\b/i,
        `Detail '${decision.detail}' must not claim protected`,
      );
    }
  });
});

describe("deriveOutsideCallState", () => {
  test("backend reachable returns ready state with 'Protection ready'", () => {
    const state = deriveOutsideCallState(true);
    assert.equal(state.state, "ready");
    assert.equal(state.label, "Protection ready");
    assert.match(state.detail, /watches for calls/i);
  });

  test("backend unreachable returns offline state", () => {
    const state = deriveOutsideCallState(false);
    assert.equal(state.state, "offline");
    assert.equal(state.label, "Handshake · Offline");
    assert.match(state.detail, /cannot be confirmed until the server is reachable/i);
  });
});
