/**
 * In-call and outside-call trust state resolution tests.
 *
 * Covers deriveCallState and deriveOutsideCallState from mobile/lib/trust/callState.ts.
 *
 * Invariants under test:
 *   1. Risk detected always outranks confirmed trust (duress / pressure overrides identity).
 *   2. Trusted state requires BOTH server confirmation AND local attestation verification.
 *   3. Missing circle, revoked device, unconfirmed peer, or network partition fallback cleanly to unverified / offline / error states.
 *   4. State machine NEVER claims or produces 'Protected' status without evidence.
 *   5. Outside-call state is calm ('ready' or 'offline') and never a warning surface.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

describe("deriveOutsideCallState", () => {
  test("returns ready state when backend is reachable", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.match(res.detail, /watches for calls/);
  });

  test("returns offline state when backend is unreachable", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /cannot be confirmed/);
  });

  test("never produces a risk or warning state outside a call", () => {
    const online = deriveOutsideCallState(true);
    const offline = deriveOutsideCallState(false);
    assert.notEqual(online.state, "risk");
    assert.notEqual(offline.state, "risk");
    assert.doesNotMatch(online.label.toLowerCase(), /risk/);
    assert.doesNotMatch(offline.label.toLowerCase(), /risk/);
  });
});

describe("deriveCallState", () => {
  const baseContext: CallContext = {
    callActive: true,
    hasTrustedCircle: true,
    deviceAuthorized: true,
    backendReachable: true,
    trust: null,
    riskDetected: false,
    audioAvailable: false,
    analysisInFlight: false,
  };

  test("inactive call returns verify/ready fallback", () => {
    const res = deriveCallState({ ...baseContext, callActive: false });
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Ready");
    assert.match(res.detail, /watching for calls/);
  });

  test("risk detected outranks confirmed trust (invariant 1)", () => {
    const res = deriveCallState({
      ...baseContext,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(res.state, "risk");
    assert.equal(res.label, "Handshake · Risk detected");
    assert.match(res.detail, /pressure tactics/);
  });

  test("server confirmed AND locally verified attestation yields trusted (invariant 2)", () => {
    const res = deriveCallState({
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(res.state, "trusted");
    assert.equal(res.label, "Handshake · Trusted connection");
    assert.match(res.detail, /Both phones confirmed/);
  });

  test("server confirmed but attestation NOT verified does NOT yield trusted (invariant 2)", () => {
    // When server confirmed but attestation failed, it falls through.
    // If analysis is in flight:
    const inFlight = deriveCallState({
      ...baseContext,
      audioAvailable: true,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.notEqual(inFlight.state, "trusted");
    assert.equal(inFlight.state, "verifying");

    // If analysis is not in flight and audio unavailable:
    const noAudio = deriveCallState({
      ...baseContext,
      audioAvailable: false,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.notEqual(noAudio.state, "trusted");
    assert.equal(noAudio.state, "capture_unavailable");
  });

  test("local attestation verified but server NOT confirmed does NOT yield trusted", () => {
    const res = deriveCallState({
      ...baseContext,
      audioAvailable: false,
      trust: { serverConfirmed: false, attestationVerified: true },
    });
    assert.notEqual(res.state, "trusted");
    assert.equal(res.state, "capture_unavailable");
  });

  test("backend unreachable while evaluating trusted circle yields offline state", () => {
    const res = deriveCallState({
      ...baseContext,
      backendReachable: false,
    });
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /Cannot reach server/);
  });

  test("audio unavailable yields capture_unavailable with honest copy", () => {
    const res = deriveCallState({
      ...baseContext,
      audioAvailable: false,
    });
    assert.equal(res.state, "capture_unavailable");
    assert.equal(res.label, "Handshake · Unable to verify");
    assert.match(res.detail, /audio cannot be accessed/);
  });

  test("analysis in flight yields analyzing progress state", () => {
    const res = deriveCallState({
      ...baseContext,
      audioAvailable: true,
      analysisInFlight: true,
      trust: null,
    });
    assert.equal(res.state, "analyzing");
    assert.equal(res.label, "Handshake · Analyzing…");
    assert.match(res.detail, /Evaluating trust signals/);
  });

  test("pre-analysis ready state yields initializing progress state", () => {
    const res = deriveCallState({
      ...baseContext,
      audioAvailable: true,
      analysisInFlight: false,
      trust: null,
    });
    assert.equal(res.state, "initializing");
    assert.equal(res.label, "Handshake · Initializing…");
    assert.match(res.detail, /Preparing to verify/);
  });

  test("no trusted circle returns verify with guidance to pair beforehand", () => {
    const res = deriveCallState({
      ...baseContext,
      hasTrustedCircle: false,
    });
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Verify");
    assert.match(res.detail, /Add a trusted person before the call/);
  });

  test("revoked device returns verify with honest revoked notice", () => {
    const res = deriveCallState({
      ...baseContext,
      hasTrustedCircle: true,
      deviceAuthorized: false,
    });
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Verify");
    assert.match(res.detail, /revoked/);
  });

  test("no state ever claims 'Protected' (invariant 4)", () => {
    const variations: CallContext[] = [
      { ...baseContext, riskDetected: true },
      { ...baseContext, trust: { serverConfirmed: true, attestationVerified: true } },
      { ...baseContext, trust: { serverConfirmed: false, attestationVerified: false } },
      { ...baseContext, audioAvailable: true, analysisInFlight: true },
      { ...baseContext, audioAvailable: true, analysisInFlight: false },
      { ...baseContext, backendReachable: false },
      { ...baseContext, hasTrustedCircle: false },
      { ...baseContext, deviceAuthorized: false },
      { ...baseContext, callActive: false },
    ];

    for (const ctx of variations) {
      const decision = deriveCallState(ctx);
      assert.notEqual(decision.state, "protected" as unknown);
      assert.doesNotMatch(decision.label.toLowerCase(), /\bprotected\b/);
      assert.doesNotMatch(decision.detail.toLowerCase(), /\bprotected\b/);
    }
  });
});
