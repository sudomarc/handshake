/**
 * Mobile call state derivation and offline trust state fallback unit tests.
 *
 * Verifies that deriveCallState and deriveOutsideCallState in mobile/lib/trust/callState.ts
 * produce correct, honest state decisions under all call contexts including:
 *   - Risk precedence over trusted status
 *   - Outside call states
 *   - Verified mutual trust session requirements
 *   - Offline / backend unreachable states
 *   - Capture unavailable and progress states
 *   - Revoked device or missing circle fallbacks
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

describe("mobile/lib/trust/callState", () => {
  describe("deriveCallState", () => {
    test("riskDetected always takes precedence, even over verified trust", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: { serverConfirmed: true, attestationVerified: true },
        riskDetected: true,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "risk");
      assert.equal(decision.label, "Handshake · Risk detected");
      assert.match(decision.detail, /pressure tactics/i);
    });

    test("outside active call returns verify ready state", () => {
      const ctx: CallContext = {
        callActive: false,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: false,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "verify");
      assert.equal(decision.label, "Handshake · Ready");
    });

    test("serverConfirmed AND attestationVerified returns trusted state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: { serverConfirmed: true, attestationVerified: true },
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "trusted");
      assert.equal(decision.label, "Handshake · Trusted connection");
    });

    test("serverConfirmed without attestationVerified does NOT produce trusted state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: { serverConfirmed: true, attestationVerified: false },
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: true,
      };

      const decision = deriveCallState(ctx);
      assert.notEqual(decision.state, "trusted");
      assert.equal(decision.state, "verifying");
    });

    test("unreachable backend yields offline state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: false,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "offline");
      assert.equal(decision.label, "Handshake · Offline");
      assert.match(decision.detail, /cannot reach server/i);
    });

    test("unavailable call audio yields capture_unavailable state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: false,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "capture_unavailable");
      assert.match(decision.detail, /cannot be accessed/i);
    });

    test("analysis in flight yields analyzing or verifying progress states", () => {
      const ctxAnalyzing: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: true,
      };

      assert.equal(deriveCallState(ctxAnalyzing).state, "analyzing");

      const ctxVerifying: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: { serverConfirmed: true, attestationVerified: false },
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: true,
      };

      assert.equal(deriveCallState(ctxVerifying).state, "verifying");
    });

    test("initializing state when ready to evaluate", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "initializing");
    });

    test("no trusted circle returns verify state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: false,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "verify");
      assert.match(decision.detail, /add a trusted person/i);
    });

    test("revoked device returns verify state", () => {
      const ctx: CallContext = {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: false,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      };

      const decision = deriveCallState(ctx);
      assert.equal(decision.state, "verify");
      assert.match(decision.detail, /revoked/i);
    });
  });

  describe("deriveOutsideCallState", () => {
    test("backend reachable returns protection ready", () => {
      const res = deriveOutsideCallState(true);
      assert.equal(res.state, "ready");
      assert.equal(res.label, "Protection ready");
    });

    test("backend unreachable returns offline state", () => {
      const res = deriveOutsideCallState(false);
      assert.equal(res.state, "offline");
      assert.equal(res.label, "Handshake · Offline");
    });
  });
});
