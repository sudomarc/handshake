/**
 * Tests for mobile/lib/trust/callState.ts
 *
 * Guarantees under test:
 *   1. Risk priority: a risk signal outranks confirmed trust, in-flight analysis,
 *      and every other state.
 *   2. Outside-call handling: when callActive is false, deriveCallState returns "verify"
 *      with "Ready", and deriveOutsideCallState returns calm trust-centre states
 *      ("ready" or "offline").
 *   3. Trust requires mutual verification: "trusted" is only produced when
 *      serverConfirmed AND attestationVerified are both true.
 *   4. State progression during active call with trusted circle:
 *      - offline (backend unreachable)
 *      - capture_unavailable (audio unavailable)
 *      - analyzing (analysis in flight without server confirmation)
 *      - verifying (analysis in flight with server confirmation awaiting attestation)
 *      - initializing (audio available, backend reachable, analysis pending)
 *   5. Honesty on revoked or missing circles: falls back to "verify" with truthful copy.
 *   6. Anti-overclaiming invariant: "protected" is NEVER claimed in any label or detail.
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

describe("deriveCallState", () => {
  test("riskDetected outranks confirmed trust", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: true },
      riskDetected: true,
    });
    assert.equal(decision.state, "risk");
    assert.equal(decision.label, "Handshake · Risk detected");
    assert.equal(decision.detail, "Handshake detected pressure tactics in this call.");
  });

  test("riskDetected outranks audio analysis and offline conditions", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      backendReachable: false,
      audioAvailable: false,
      analysisInFlight: true,
      riskDetected: true,
    });
    assert.equal(decision.state, "risk");
  });

  test("when not in a call (callActive: false), returns calm ready state", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      callActive: false,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Ready");
    assert.equal(decision.detail, "Handshake is watching for calls.");
  });

  test("trusted state requires BOTH server confirmation AND attestation verification", () => {
    // Both confirmed
    const trusted = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(trusted.state, "trusted");
    assert.equal(trusted.label, "Handshake · Trusted connection");
    assert.equal(trusted.detail, "Both phones confirmed the same trusted relationship.");

    // Server confirmed but attestation NOT verified -> does not yield trusted
    const unverifiedAttestation = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.notEqual(unverifiedAttestation.state, "trusted");

    // Attestation verified but server NOT confirmed -> does not yield trusted
    const unconfirmedServer = deriveCallState({
      ...BASE_CONTEXT,
      trust: { serverConfirmed: false, attestationVerified: true },
    });
    assert.notEqual(unconfirmedServer.state, "trusted");
  });

  test("offline state when backend is unreachable during call with trusted circle", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      backendReachable: false,
    });
    assert.equal(decision.state, "offline");
    assert.equal(decision.label, "Handshake · Offline");
    assert.equal(decision.detail, "Cannot reach server to confirm this call.");
  });

  test("capture_unavailable state when audio capture cannot be accessed", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      audioAvailable: false,
    });
    assert.equal(decision.state, "capture_unavailable");
    assert.equal(decision.label, "Handshake · Unable to verify");
    assert.equal(decision.detail, "Call audio cannot be accessed for analysis.");
  });

  test("analyzing state when analysis request is in flight", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      analysisInFlight: true,
    });
    assert.equal(decision.state, "analyzing");
    assert.equal(decision.label, "Handshake · Analyzing…");
    assert.equal(decision.detail, "Evaluating trust signals for this call.");
  });

  test("verifying state when server confirmed but local attestation is in flight", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    });
    assert.equal(decision.state, "verifying");
    assert.equal(decision.label, "Handshake · Verifying…");
    assert.equal(decision.detail, "Confirming both phones match this call.");
  });

  test("initializing state when ready to verify with audio available", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      audioAvailable: true,
      analysisInFlight: false,
    });
    assert.equal(decision.state, "initializing");
    assert.equal(decision.label, "Handshake · Initializing…");
    assert.equal(decision.detail, "Preparing to verify this call.");
  });

  test("verify state when no trusted circle exists", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      hasTrustedCircle: false,
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.equal(
      decision.detail,
      "Add a trusted person before the call to confirm it automatically.",
    );
  });

  test("verify state when device authorization is revoked", () => {
    const decision = deriveCallState({
      ...BASE_CONTEXT,
      deviceAuthorized: false,
    });
    assert.equal(decision.state, "verify");
    assert.equal(decision.label, "Handshake · Verify");
    assert.equal(decision.detail, "This phone's trust for this person was revoked.");
  });

  test("never claims 'Protected' in any label or detail across all permutations", () => {
    const booleans = [true, false];
    for (const callActive of booleans) {
      for (const hasTrustedCircle of booleans) {
        for (const deviceAuthorized of booleans) {
          for (const backendReachable of booleans) {
            for (const riskDetected of booleans) {
              for (const audioAvailable of booleans) {
                for (const analysisInFlight of booleans) {
                  for (const trust of [
                    null,
                    { serverConfirmed: false, attestationVerified: false },
                    { serverConfirmed: true, attestationVerified: false },
                    { serverConfirmed: false, attestationVerified: true },
                    { serverConfirmed: true, attestationVerified: true },
                  ]) {
                    const decision = deriveCallState({
                      callActive,
                      hasTrustedCircle,
                      deviceAuthorized,
                      backendReachable,
                      trust,
                      riskDetected,
                      audioAvailable,
                      analysisInFlight,
                    });
                    assert.doesNotMatch(
                      decision.label,
                      /protected/i,
                      `Label '${decision.label}' must not claim protected`,
                    );
                    assert.doesNotMatch(
                      decision.detail,
                      /protected/i,
                      `Detail '${decision.detail}' must not claim protected`,
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});

describe("deriveOutsideCallState", () => {
  test("returns ready state when backend is reachable", () => {
    const outside = deriveOutsideCallState(true);
    assert.equal(outside.state, "ready");
    assert.equal(outside.label, "Protection ready");
    assert.equal(outside.detail, "Handshake watches for calls and checks trusted people.");
  });

  test("returns offline state when backend is unreachable", () => {
    const outside = deriveOutsideCallState(false);
    assert.equal(outside.state, "offline");
    assert.equal(outside.label, "Handshake · Offline");
    assert.equal(outside.detail, "Calls cannot be confirmed until the server is reachable.");
  });
});
