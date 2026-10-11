/**
 * Call state decision tests.
 *
 * Covers:
 *   1. deriveCallState precedence rules (risk outranks trust; active call evidence;
 *      progress states initializing/analyzing/verifying; offline and capture_unavailable;
 *      untrusted circle / unauthorized fallbacks);
 *   2. deriveOutsideCallState (ready vs offline outside a call).
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

describe("deriveCallState", () => {
  const baseContext: CallContext = {
    callActive: true,
    hasTrustedCircle: true,
    deviceAuthorized: true,
    backendReachable: true,
    trust: null,
    riskDetected: false,
    audioAvailable: true,
    analysisInFlight: false,
  };

  test("precedence: riskDetected always wins, even over valid trust evidence", () => {
    const ctx: CallContext = {
      ...baseContext,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "risk");
    assert.match(decision.label, /Risk detected/);
    assert.match(decision.detail, /pressure tactics/);
  });

  test("outside call: when callActive is false, returns verify/ready state", () => {
    const ctx: CallContext = {
      ...baseContext,
      callActive: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
    assert.match(decision.detail, /watching for calls/);
  });

  test("trusted connection: server confirmed and attestation locally verified", () => {
    const ctx: CallContext = {
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "trusted");
    assert.equal(decision.label, "Handshake · Trusted connection");
    assert.match(decision.detail, /Both phones confirmed/);
  });

  test("progress state: verifying when server confirmed but local attestation in progress", () => {
    const ctx: CallContext = {
      ...baseContext,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verifying");
    assert.equal(decision.label, "Handshake · Verifying…");
    assert.match(decision.detail, /Confirming both phones/);
  });

  test("progress state: analyzing when analysis in flight without server confirmation yet", () => {
    const ctx: CallContext = {
      ...baseContext,
      analysisInFlight: true,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "analyzing");
    assert.equal(decision.label, "Handshake · Analyzing…");
    assert.match(decision.detail, /Evaluating trust signals/);
  });

  test("progress state: initializing when call active but analysis not yet started", () => {
    const ctx: CallContext = {
      ...baseContext,
      analysisInFlight: false,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "initializing");
    assert.equal(decision.label, "Handshake · Initializing…");
    assert.match(decision.detail, /Preparing to verify/);
  });

  test("diagnostic state: offline when backend is unreachable", () => {
    const ctx: CallContext = {
      ...baseContext,
      backendReachable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "offline");
    assert.equal(decision.label, "Handshake · Offline");
    assert.match(decision.detail, /Cannot reach server/);
  });

  test("diagnostic state: capture_unavailable when call audio cannot be captured", () => {
    const ctx: CallContext = {
      ...baseContext,
      audioAvailable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "capture_unavailable");
    assert.equal(decision.label, "Handshake · Unable to verify");
    assert.match(decision.detail, /audio cannot be accessed/);
  });

  test("fallback: verify state when caller has no trusted circle", () => {
    const ctx: CallContext = {
      ...baseContext,
      hasTrustedCircle: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /Add a trusted person/);
  });

  test("fallback: verify state when device trust is revoked", () => {
    const ctx: CallContext = {
      ...baseContext,
      deviceAuthorized: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /revoked/);
  });
});

describe("deriveOutsideCallState", () => {
  test("returns ready state when backend is reachable outside a call", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.match(res.detail, /watches for calls/);
  });

  test("returns offline state when backend is unreachable outside a call", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /Cannot be confirmed/i);
  });
});
