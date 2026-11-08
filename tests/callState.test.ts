/**
 * Call state derivation tests.
 *
 * Validates the core invariants in mobile/lib/trust/callState.ts:
 *   1. Risk always outranks trust, active calls, and all other states.
 *   2. Inactive call returns "verify" (or "ready" / "offline" outside call).
 *   3. Trusted status requires BOTH server confirmation AND local attestation verification.
 *   4. Partially trusted / unverified never promotes to trusted.
 *   5. Honest progress states (initializing, capture_unavailable, analyzing, verifying, offline)
 *      during trusted circle calls.
 *   6. Fallbacks for revoked devices or missing circles.
 *   7. The overlay/state machine strictly avoids claiming 'Protected' status.
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

describe("deriveCallState", () => {
  test("riskDetected always wins over trust and all other signals", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      riskDetected: true,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "risk");
    assert.match(decision.label, /Risk detected/i);
    assert.match(decision.detail, /pressure tactics/i);
  });

  test("call inactive returns verify state with ready label", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      callActive: false,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.match(decision.label, /Ready/i);
    assert.match(decision.detail, /watching for calls/i);
  });

  test("serverConfirmed AND attestationVerified → trusted", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: true },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "trusted");
    assert.match(decision.label, /Trusted connection/i);
    assert.match(decision.detail, /Both phones confirmed/i);
  });

  test("serverConfirmed but attestationVerified false → does not promote to trusted", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      trust: { serverConfirmed: true, attestationVerified: false },
    };
    const decision = deriveCallState(ctx);
    assert.notEqual(decision.state, "trusted");
  });

  test("trusted circle but backend unreachable → offline", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      backendReachable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "offline");
    assert.match(decision.label, /Offline/i);
    assert.match(decision.detail, /Cannot reach server/i);
  });

  test("audio unavailable → capture_unavailable", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      audioAvailable: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "capture_unavailable");
    assert.match(decision.label, /Unable to verify/i);
    assert.match(decision.detail, /Call audio cannot be accessed/i);
  });

  test("analysisInFlight with server confirmation in progress → verifying", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      analysisInFlight: true,
      trust: { serverConfirmed: true, attestationVerified: false },
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verifying");
    assert.match(decision.label, /Verifying/i);
    assert.match(decision.detail, /Confirming both phones match/i);
  });

  test("analysisInFlight without server confirmation yet → analyzing", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      analysisInFlight: true,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "analyzing");
    assert.match(decision.label, /Analyzing/i);
    assert.match(decision.detail, /Evaluating trust signals/i);
  });

  test("trusted circle, backend reachable, audio available, no analysis in flight → initializing", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      analysisInFlight: false,
      trust: null,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "initializing");
    assert.match(decision.label, /Initializing/i);
    assert.match(decision.detail, /Preparing to verify this call/i);
  });

  test("no trusted circle → verify", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      hasTrustedCircle: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.match(decision.label, /Verify/i);
    assert.match(decision.detail, /Add a trusted person before the call/i);
  });

  test("device not authorized / revoked → verify", () => {
    const ctx: CallContext = {
      ...BASE_CONTEXT,
      deviceAuthorized: false,
    };
    const decision = deriveCallState(ctx);
    assert.equal(decision.state, "verify");
    assert.match(decision.label, /Verify/i);
    assert.match(decision.detail, /revoked/i);
  });

  test("no state or detail ever claims 'Protected'", () => {
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
      assert.doesNotMatch(decision.label, /protected/i);
      assert.doesNotMatch(decision.detail, /protected/i);
    }
  });
});

describe("deriveOutsideCallState", () => {
  test("backend reachable → ready", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.match(res.label, /Protection ready/i);
    assert.match(res.detail, /watches for calls/i);
  });

  test("backend unreachable → offline", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.match(res.label, /Offline/i);
    assert.match(res.detail, /Calls cannot be confirmed/i);
  });
});
