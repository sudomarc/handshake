/**
 * Call state derivation unit tests.
 *
 * Tests deriveCallState and deriveOutsideCallState from mobile/lib/trust/callState.ts,
 * verifying that call state logic correctly enforces security priority rules:
 * - Risk detection outranks trust confirmation.
 * - Call activity alone NEVER produces a trusted state.
 * - Trusted state requires server confirmation AND local attestation verification during an active call.
 * - Unreachable backend, unconfirmed circle, or revoked device cleanly falls back to verify.
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

const baseContext: CallContext = {
  callActive: true,
  hasTrustedCircle: true,
  deviceAuthorized: true,
  backendReachable: true,
  trust: null,
  riskDetected: false,
};

describe("deriveCallState", () => {
  test("risk detection outranks trusted confirmation", () => {
    const ctx: CallContext = {
      ...baseContext,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "risk");
    assert.equal(decision.label, "Handshake · Risk detected");
    assert.match(decision.detail, /pressure tactics/i);
  });

  test("server confirmed + local attestation verified during active call returns trusted state", () => {
    const ctx: CallContext = {
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "trusted");
    assert.equal(decision.label, "Handshake · Trusted connection");
    assert.match(decision.detail, /Both phones confirmed/i);
  });

  test("call activity alone without trust evidence returns verify state", () => {
    const ctx: CallContext = {
      ...baseContext,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /could not confirm both phones/i);
  });

  test("unconfirmed server session during active call returns verify state", () => {
    const ctx: CallContext = {
      ...baseContext,
      trust: { serverConfirmed: false, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
  });

  test("failed local attestation verification during active call returns verify state", () => {
    const ctx: CallContext = {
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: false },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
  });

  test("inactive call returns verify state with Handshake · Ready label", () => {
    const ctx: CallContext = {
      ...baseContext,
      callActive: false,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
    assert.match(decision.detail, /watching for calls/i);
  });

  test("unreachable backend during active call returns verify state", () => {
    const ctx: CallContext = {
      ...baseContext,
      backendReachable: false,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /cannot reach the server/i);
  });

  test("missing trusted circle returns verify state prompting user to add trusted person", () => {
    const ctx: CallContext = {
      ...baseContext,
      hasTrustedCircle: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /Add a trusted person/i);
  });

  test("revoked device returns verify state explaining revocation", () => {
    const ctx: CallContext = {
      ...baseContext,
      deviceAuthorized: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.match(decision.detail, /revoked/i);
  });
});

describe("deriveOutsideCallState", () => {
  test("online backend returns ready state", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.match(res.detail, /watches for calls/i);
  });

  test("offline backend returns offline state", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /cannot be confirmed/i);
  });
});
