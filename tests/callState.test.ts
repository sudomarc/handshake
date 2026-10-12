/**
 * Call state decision engine tests.
 *
 * Verifies that deriveCallState and deriveOutsideCallState accurately translate
 * call context signals into exact, honest product states without overclaiming.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

const BASE_CALL_CONTEXT: CallContext = {
  callActive: true,
  hasTrustedCircle: true,
  deviceAuthorized: true,
  backendReachable: true,
  trust: null,
  riskDetected: false,
  audioAvailable: true,
  analysisInFlight: false,
};

describe("deriveCallState", () => {
  test("riskDetected outranks all other signals including active trust", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "risk");
    assert.equal(decision.label, "Handshake · Risk detected");
    assert.match(decision.detail, /pressure tactics/i);
  });

  test("when not in a call, returns ready status", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      callActive: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
  });

  test("serverConfirmed and attestationVerified returns trusted connection", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "trusted");
    assert.equal(decision.label, "Handshake · Trusted connection");
    assert.match(decision.detail, /both phones confirmed/i);
  });

  test("serverConfirmed but attestation not verified shows verifying state when analyzing", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: false },
      analysisInFlight: true,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verifying");
    assert.equal(decision.label, "Handshake · Verifying…");
    assert.match(decision.detail, /confirming both phones/i);
  });

  test("unreachable backend returns offline state", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      backendReachable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "offline");
    assert.equal(decision.label, "Handshake · Offline");
    assert.match(decision.detail, /cannot reach server/i);
  });

  test("unavailable audio capture returns capture_unavailable state", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      audioAvailable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "capture_unavailable");
    assert.equal(decision.label, "Handshake · Unable to verify");
    assert.match(decision.detail, /audio cannot be accessed/i);
  });

  test("analysis in flight with no trust evidence shows analyzing state", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      analysisInFlight: true,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "analyzing");
    assert.equal(decision.label, "Handshake · Analyzing…");
    assert.match(decision.detail, /evaluating trust signals/i);
  });

  test("idle active call with trusted circle shows initializing state", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      analysisInFlight: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "initializing");
    assert.equal(decision.label, "Handshake · Initializing…");
    assert.match(decision.detail, /preparing to verify/i);
  });

  test("call without trusted circle prompts user to add trusted person", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      hasTrustedCircle: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /add a trusted person/i);
  });

  test("unauthorized or revoked device prompts verify with revocation explanation", () => {
    const ctx: CallContext = {
      ...BASE_CALL_CONTEXT,
      deviceAuthorized: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /revoked/i);
  });
});

describe("deriveOutsideCallState", () => {
  test("backend reachable returns protection ready", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.match(res.detail, /watches for calls/i);
  });

  test("backend unreachable returns offline state", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /cannot be confirmed/i);
  });
});
