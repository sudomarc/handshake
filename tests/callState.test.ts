/**
 * Tests for the call state machine in `mobile/lib/trust/callState.ts`.
 *
 * Guarantees under test:
 *   1. Risk detected outranks all other states (including confirmed trust);
 *   2. Outside call returns calm trust center states ("ready" or "offline");
 *   3. Trusted state requires BOTH server confirmation AND local attestation verification;
 *   4. Server confirmation without local attestation verification NEVER yields "trusted";
 *   5. Offline during call correctly yields "offline" when a trusted relationship exists;
 *   6. Missing audio capture yields "capture_unavailable";
 *   7. In-flight analysis reflects the appropriate progress phase ("verifying", "analyzing", "initializing");
 *   8. Unpaired circles or revoked devices yield honest "verify" states;
 *   9. No state or detail ever claims unearned "Protected" status during a call.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

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

  test("risk detected strictly outranks confirmed mutual trust", () => {
    const decision = deriveCallState({
      ...baseContext,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    });

    assert.equal(decision.state, "risk");
    assert.equal(decision.label, "Handshake · Risk detected");
    assert.match(decision.detail, /pressure tactics/i);
  });

  test("outside call (callActive: false) returns verify state with Handshake · Ready label", () => {
    const decision = deriveCallState({
      ...baseContext,
      callActive: false,
      trust: { serverConfirmed: true, attestationVerified: true },
    });

    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
    assert.match(decision.detail, /watching for calls/i);
  });

  test("confirmed mutual trust requires BOTH server confirmation AND attestation verification", () => {
    const fullyTrusted = deriveCallState({
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: true },
    });

    assert.equal(fullyTrusted.state, "trusted");
    assert.equal(fullyTrusted.label, "Handshake · Trusted connection");
    assert.match(fullyTrusted.detail, /both phones confirmed/i);
  });

  test("server confirmed without attestation verification is NEVER trusted", () => {
    const unverifiedAttestation = deriveCallState({
      ...baseContext,
      trust: { serverConfirmed: true, attestationVerified: false },
      analysisInFlight: true,
    });

    assert.notEqual(unverifiedAttestation.state, "trusted");
    assert.equal(unverifiedAttestation.state, "verifying");
    assert.equal(unverifiedAttestation.label, "Handshake · Verifying…");
    assert.match(unverifiedAttestation.detail, /confirming both phones match/i);
  });

  test("unreachable backend during call with trusted circle returns offline", () => {
    const offlineCall = deriveCallState({
      ...baseContext,
      backendReachable: false,
      trust: null,
    });

    assert.equal(offlineCall.state, "offline");
    assert.equal(offlineCall.label, "Handshake · Offline");
    assert.match(offlineCall.detail, /cannot reach server/i);
  });

  test("unavailable call audio capture returns capture_unavailable", () => {
    const noAudio = deriveCallState({
      ...baseContext,
      audioAvailable: false,
    });

    assert.equal(noAudio.state, "capture_unavailable");
    assert.equal(noAudio.label, "Handshake · Unable to verify");
    assert.match(noAudio.detail, /call audio cannot be accessed/i);
  });

  test("in-flight analysis without prior confirmation returns analyzing", () => {
    const analyzing = deriveCallState({
      ...baseContext,
      analysisInFlight: true,
      trust: null,
    });

    assert.equal(analyzing.state, "analyzing");
    assert.equal(analyzing.label, "Handshake · Analyzing…");
    assert.match(analyzing.detail, /evaluating trust signals/i);
  });

  test("reachable backend with audio and trusted circle before analysis returns initializing", () => {
    const initializing = deriveCallState({
      ...baseContext,
      analysisInFlight: false,
      trust: null,
    });

    assert.equal(initializing.state, "initializing");
    assert.equal(initializing.label, "Handshake · Initializing…");
    assert.match(initializing.detail, /preparing to verify/i);
  });

  test("unpaired call (hasTrustedCircle: false) returns verify with pairing advice", () => {
    const noCircle = deriveCallState({
      ...baseContext,
      hasTrustedCircle: false,
    });

    assert.equal(noCircle.state, "verify");
    assert.equal(noCircle.label, "Handshake · Verify");
    assert.match(noCircle.detail, /add a trusted person before the call/i);
  });

  test("revoked device (deviceAuthorized: false) returns verify with revocation notice", () => {
    const revoked = deriveCallState({
      ...baseContext,
      deviceAuthorized: false,
    });

    assert.equal(revoked.state, "verify");
    assert.equal(revoked.label, "Handshake · Verify");
    assert.match(revoked.detail, /revoked/i);
  });

  test("in-call states and details strictly avoid claiming 'protected' status", () => {
    const testCases: CallContext[] = [
      { ...baseContext, trust: { serverConfirmed: true, attestationVerified: true } },
      {
        ...baseContext,
        trust: { serverConfirmed: true, attestationVerified: false },
        analysisInFlight: true,
      },
      { ...baseContext, backendReachable: false },
      { ...baseContext, audioAvailable: false },
      { ...baseContext, analysisInFlight: true },
      { ...baseContext, analysisInFlight: false },
      { ...baseContext, hasTrustedCircle: false },
      { ...baseContext, deviceAuthorized: false },
      { ...baseContext, riskDetected: true },
    ];

    for (const ctx of testCases) {
      const decision = deriveCallState(ctx);
      assert.notEqual(decision.state as string, "protected");
      assert.doesNotMatch(decision.label, /\bprotected\b/i);
      assert.doesNotMatch(decision.detail, /\bprotected\b/i);
    }
  });
});

describe("deriveOutsideCallState", () => {
  test("when backend is reachable, returns ready outside call state", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.match(res.detail, /watches for calls/i);
  });

  test("when backend is unreachable, returns offline outside call state", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.match(res.detail, /cannot be confirmed until the server is reachable/i);
  });
});
