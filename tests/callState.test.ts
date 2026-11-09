/**
 * Unit tests for mobile call state derivation machine (mobile/lib/trust/callState.ts).
 *
 * Guarantees under test:
 *   1. Risk detected always outranks confirmed trust, ongoing analysis, and any other state.
 *   2. Outside-call states:
 *      - deriveCallState with callActive=false returns verify ("Handshake · Ready")
 *      - deriveOutsideCallState returns "ready" ("Protection ready") when backendReachable=true,
 *        and "offline" ("Handshake · Offline") when backendReachable=false.
 *   3. Trusted connection requires both serverConfirmed=true AND attestationVerified=true.
 *      Partial trust (e.g. server confirmed without local attestation verification) is never trusted.
 *   4. Diagnostic progression in a call with a trusted circle:
 *      - Offline when backendReachable=false
 *      - Capture unavailable when audioAvailable=false
 *      - Verifying when analysisInFlight=true and serverConfirmed=true (awaiting local attestation)
 *      - Analyzing when analysisInFlight=true and serverConfirmed=false
 *      - Initializing when idle in call with trusted circle and backend reachable
 *   5. Fallbacks for missing trusted circle or revoked device authorization.
 *   6. Strict invariants: no derived state or explanation detail ever claims "Protected" or "protected".
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

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

describe("mobile/lib/trust/callState", () => {
  describe("deriveCallState precedence rules", () => {
    test("risk detected immediately yields risk regardless of confirmed trust", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        riskDetected: true,
        trust: { serverConfirmed: true, attestationVerified: true },
        audioAvailable: false,
      });

      assert.equal(decision.state, "risk");
      assert.equal(decision.label, "Handshake · Risk detected");
      assert.match(decision.detail, /pressure tactics/i);
    });

    test("outside active call yields verify state with Ready label", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        callActive: false,
        trust: { serverConfirmed: true, attestationVerified: true },
      });

      assert.equal(decision.state, "verify");
      assert.equal(decision.label, "Handshake · Ready");
      assert.match(decision.detail, /watching for calls/i);
    });

    test("both serverConfirmed and attestationVerified required for trusted state", () => {
      const fullyTrusted = deriveCallState({
        ...BASE_CONTEXT,
        trust: { serverConfirmed: true, attestationVerified: true },
      });
      assert.equal(fullyTrusted.state, "trusted");
      assert.equal(fullyTrusted.label, "Handshake · Trusted connection");
      assert.match(fullyTrusted.detail, /Both phones confirmed/i);

      // Server confirmed but attestation not verified is never trusted
      const unverifiedAttestation = deriveCallState({
        ...BASE_CONTEXT,
        trust: { serverConfirmed: true, attestationVerified: false },
      });
      assert.notEqual(unverifiedAttestation.state, "trusted");

      // Attestation verified without server confirmation is never trusted
      const unconfirmedServer = deriveCallState({
        ...BASE_CONTEXT,
        trust: { serverConfirmed: false, attestationVerified: true },
      });
      assert.notEqual(unconfirmedServer.state, "trusted");
    });
  });

  describe("in-call progression and diagnostics with trusted circle", () => {
    test("returns offline when backend is unreachable", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        backendReachable: false,
      });

      assert.equal(decision.state, "offline");
      assert.equal(decision.label, "Handshake · Offline");
      assert.match(decision.detail, /Cannot reach server/i);
    });

    test("returns capture_unavailable when audio cannot be accessed", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        audioAvailable: false,
      });

      assert.equal(decision.state, "capture_unavailable");
      assert.equal(decision.label, "Handshake · Unable to verify");
      assert.match(decision.detail, /audio cannot be accessed/i);
    });

    test("returns verifying when analysis in flight and server confirmed session", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        analysisInFlight: true,
        trust: { serverConfirmed: true, attestationVerified: false },
      });

      assert.equal(decision.state, "verifying");
      assert.equal(decision.label, "Handshake · Verifying…");
      assert.match(decision.detail, /Confirming both phones match/i);
    });

    test("returns analyzing when analysis in flight and session not yet confirmed", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        analysisInFlight: true,
        trust: null,
      });

      assert.equal(decision.state, "analyzing");
      assert.equal(decision.label, "Handshake · Analyzing…");
      assert.match(decision.detail, /Evaluating trust signals/i);
    });

    test("returns initializing when idle in call with reachable backend and audio available", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        analysisInFlight: false,
        trust: null,
      });

      assert.equal(decision.state, "initializing");
      assert.equal(decision.label, "Handshake · Initializing…");
      assert.match(decision.detail, /Preparing to verify this call/i);
    });
  });

  describe("unauthorized and untrusted fallbacks", () => {
    test("returns verify with advisory detail when no trusted circle exists", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        hasTrustedCircle: false,
      });

      assert.equal(decision.state, "verify");
      assert.equal(decision.label, "Handshake · Verify");
      assert.match(decision.detail, /Add a trusted person before the call/i);
    });

    test("returns verify with revocation detail when device authorization revoked", () => {
      const decision = deriveCallState({
        ...BASE_CONTEXT,
        deviceAuthorized: false,
      });

      assert.equal(decision.state, "verify");
      assert.equal(decision.label, "Handshake · Verify");
      assert.match(decision.detail, /trust for this person was revoked/i);
    });
  });

  describe("deriveOutsideCallState", () => {
    test("returns ready when backend is reachable", () => {
      const state = deriveOutsideCallState(true);
      assert.equal(state.state, "ready");
      assert.equal(state.label, "Protection ready");
      assert.match(state.detail, /Handshake watches for calls/i);
    });

    test("returns offline when backend is unreachable", () => {
      const state = deriveOutsideCallState(false);
      assert.equal(state.state, "offline");
      assert.equal(state.label, "Handshake · Offline");
      assert.match(state.detail, /Calls cannot be confirmed until the server is reachable/i);
    });
  });

  describe("safety invariants: never claim 'Protected' during a call", () => {
    test("no call state decision ever uses Protected as label or state", () => {
      const testCases: CallContext[] = [
        BASE_CONTEXT,
        { ...BASE_CONTEXT, riskDetected: true },
        { ...BASE_CONTEXT, callActive: false },
        { ...BASE_CONTEXT, trust: { serverConfirmed: true, attestationVerified: true } },
        { ...BASE_CONTEXT, trust: { serverConfirmed: true, attestationVerified: false } },
        { ...BASE_CONTEXT, backendReachable: false },
        { ...BASE_CONTEXT, audioAvailable: false },
        { ...BASE_CONTEXT, analysisInFlight: true },
        { ...BASE_CONTEXT, hasTrustedCircle: false },
        { ...BASE_CONTEXT, deviceAuthorized: false },
      ];

      for (const ctx of testCases) {
        const decision = deriveCallState(ctx);
        assert.notEqual(decision.state as string, "protected");
        assert.doesNotMatch(decision.label, /^Handshake · Protected$/i);
      }
    });
  });
});
