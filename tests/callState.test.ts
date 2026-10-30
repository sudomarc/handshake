/**
 * Mobile call state machine and offline trust fallback unit tests.
 *
 * Verifies that:
 *   1. Risk signals outrank all other trust states (even trusted connections);
 *   2. Server-confirmed AND locally verified attestation is required for 'trusted';
 *   3. Network partition / unreachable backend produces 'offline' state with clear messaging;
 *   4. Unenrolled circles and revoked devices map to honest 'verify' states;
 *   5. In-flight analysis states ('verifying', 'analyzing') report accurate progress;
 *   6. Outside-call states handle offline transitions;
 *   7. Copy invariants are preserved (no call state claims 'Protected').
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

const BASE_CTX: CallContext = {
  callActive: true,
  hasTrustedCircle: true,
  deviceAuthorized: true,
  backendReachable: true,
  trust: null,
  riskDetected: false,
  audioAvailable: true,
  analysisInFlight: false,
};

describe("deriveCallState - Mobile call state machine & offline fallback", () => {
  test("risk signal outranks trusted state, offline, and analysis in-flight", () => {
    // Risk when trusted
    const riskTrusted = deriveCallState({
      ...BASE_CTX,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(riskTrusted.state, "risk");
    assert.equal(riskTrusted.label, "Handshake · Risk detected");

    // Risk when offline
    const riskOffline = deriveCallState({
      ...BASE_CTX,
      riskDetected: true,
      backendReachable: false,
    });
    assert.equal(riskOffline.state, "risk");

    // Risk during analysis
    const riskAnalyzing = deriveCallState({
      ...BASE_CTX,
      riskDetected: true,
      analysisInFlight: true,
    });
    assert.equal(riskAnalyzing.state, "risk");
  });

  test("outside call (callActive: false) returns verify/ready state", () => {
    const res = deriveCallState({
      ...BASE_CTX,
      callActive: false,
    });
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Ready");
    assert.equal(res.detail, "Handshake is watching for calls.");
  });

  test("trusted state requires both server confirmation and local attestation verification", () => {
    // Fully trusted
    const fullTrust = deriveCallState({
      ...BASE_CTX,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(fullTrust.state, "trusted");
    assert.equal(fullTrust.label, "Handshake · Trusted connection");

    // Server confirmed but attestation unverified
    const unverifiedAttestation = deriveCallState({
      ...BASE_CTX,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.notEqual(unverifiedAttestation.state, "trusted");

    // Attestation verified but server unconfirmed
    const unconfirmedServer = deriveCallState({
      ...BASE_CTX,
      trust: { serverConfirmed: false, attestationVerified: true },
    });
    assert.notEqual(unconfirmedServer.state, "trusted");
  });

  test("offline trust fallback: unreachable backend produces offline state", () => {
    const offline = deriveCallState({
      ...BASE_CTX,
      backendReachable: false,
    });
    assert.equal(offline.state, "offline");
    assert.equal(offline.label, "Handshake · Offline");
    assert.equal(offline.detail, "Cannot reach server to confirm this call.");
  });

  test("audio capture unavailable produces capture_unavailable state", () => {
    const captureUnavail = deriveCallState({
      ...BASE_CTX,
      audioAvailable: false,
    });
    assert.equal(captureUnavail.state, "capture_unavailable");
    assert.equal(captureUnavail.label, "Handshake · Unable to verify");
    assert.equal(captureUnavail.detail, "Call audio cannot be accessed for analysis.");
  });

  test("analysis in flight maps to verifying or analyzing phase", () => {
    // Server confirmed, pending local attestation check -> verifying
    const verifying = deriveCallState({
      ...BASE_CTX,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.equal(verifying.state, "verifying");
    assert.equal(verifying.label, "Handshake · Verifying…");
    assert.equal(verifying.detail, "Confirming both phones match this call.");

    // Initial analysis -> analyzing
    const analyzing = deriveCallState({
      ...BASE_CTX,
      analysisInFlight: true,
      trust: null,
    });
    assert.equal(analyzing.state, "analyzing");
    assert.equal(analyzing.label, "Handshake · Analyzing…");
    assert.equal(analyzing.detail, "Evaluating trust signals for this call.");
  });

  test("initializing state when ready to verify", () => {
    const init = deriveCallState({
      ...BASE_CTX,
      analysisInFlight: false,
      trust: null,
    });
    assert.equal(init.state, "initializing");
    assert.equal(init.label, "Handshake · Initializing…");
    assert.equal(init.detail, "Preparing to verify this call.");
  });

  test("no trusted circle returns verify with guidance to add a person", () => {
    const noCircle = deriveCallState({
      ...BASE_CTX,
      hasTrustedCircle: false,
    });
    assert.equal(noCircle.state, "verify");
    assert.equal(noCircle.label, "Handshake · Verify");
    assert.equal(
      noCircle.detail,
      "Add a trusted person before the call to confirm it automatically.",
    );
  });

  test("unauthorized / revoked device returns verify state with revoked detail", () => {
    const revoked = deriveCallState({
      ...BASE_CTX,
      deviceAuthorized: false,
    });
    assert.equal(revoked.state, "verify");
    assert.equal(revoked.label, "Handshake · Verify");
    assert.equal(revoked.detail, "This phone's trust for this person was revoked.");
  });
});

describe("deriveOutsideCallState", () => {
  test("returns ready state when backend is reachable", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.equal(res.detail, "Handshake watches for calls and checks trusted people.");
  });

  test("returns offline state when backend is unreachable", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.equal(res.detail, "Calls cannot be confirmed until the server is reachable.");
  });
});

describe("Call copy invariants", () => {
  test("no call state label or detail claims 'Protected'", () => {
    const scenarios: CallContext[] = [
      BASE_CTX,
      { ...BASE_CTX, riskDetected: true },
      { ...BASE_CTX, callActive: false },
      { ...BASE_CTX, trust: { serverConfirmed: true, attestationVerified: true } },
      { ...BASE_CTX, backendReachable: false },
      { ...BASE_CTX, audioAvailable: false },
      { ...BASE_CTX, analysisInFlight: true },
      { ...BASE_CTX, hasTrustedCircle: false },
      { ...BASE_CTX, deviceAuthorized: false },
    ];

    for (const ctx of scenarios) {
      const decision = deriveCallState(ctx);
      assert.doesNotMatch(decision.label, /^Protected/i);
      assert.doesNotMatch(decision.detail, /\bprotected\b/i);
    }
  });
});
