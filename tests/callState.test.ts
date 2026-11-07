/**
 * Call state machine and offline fallback tests.
 *
 * Verifies the invariants of mobile/lib/trust/callState.ts:
 *   1. Precedence: risk signal outranks trust confirmation.
 *   2. Mutual verification: trusted status strictly requires both serverConfirmed AND attestationVerified.
 *   3. Outside call states: calm trust center (ready vs offline).
 *   4. Offline during call: unreachable backend with trusted circle produces offline state with honest copy.
 *   5. In-flight and capture states: capture_unavailable, initializing, analyzing, verifying.
 *   6. Revoked and unpaired states: honest verify copy without false security claims.
 *   7. Safety invariant: no in-call or unverified state ever produces a "Protected" claim.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deriveCallState,
  deriveOutsideCallState,
  type CallContext,
} from "../mobile/lib/trust/callState";

describe("deriveOutsideCallState", () => {
  test("when backend is reachable, reports ready with calm copy", () => {
    const res = deriveOutsideCallState(true);
    assert.equal(res.state, "ready");
    assert.equal(res.label, "Protection ready");
    assert.equal(res.detail, "Handshake watches for calls and checks trusted people.");
  });

  test("when backend is unreachable, reports offline with honest fallback copy", () => {
    const res = deriveOutsideCallState(false);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.equal(res.detail, "Calls cannot be confirmed until the server is reachable.");
  });
});

describe("deriveCallState - Precedence and Risk", () => {
  test("riskDetected outranks trusted confirmation", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "risk");
    assert.equal(res.label, "Handshake · Risk detected");
    assert.equal(res.detail, "Handshake detected pressure tactics in this call.");
  });

  test("riskDetected outranks offline backend", () => {
    const ctx: CallContext = {
      callActive: true,
      hasTrustedCircle: true,
      deviceAuthorized: true,
      backendReachable: false,
      trust: null,
      riskDetected: true,
      audioAvailable: false,
      analysisInFlight: false,
    };
    const res = deriveCallState(ctx);
    assert.equal(res.state, "risk");
  });
});

describe("deriveCallState - Outside Call Behavior", () => {
  test("callActive false produces verify state with ready label", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Ready");
    assert.equal(res.detail, "Handshake is watching for calls.");
  });
});

describe("deriveCallState - Mutual Trust Requirements", () => {
  test("both serverConfirmed AND attestationVerified → trusted", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "trusted");
    assert.equal(res.label, "Handshake · Trusted connection");
    assert.equal(res.detail, "Both phones confirmed the same trusted relationship.");
  });

  test("serverConfirmed true but attestationVerified false never produces trusted", () => {
    const ctx: CallContext = {
      callActive: true,
      hasTrustedCircle: true,
      deviceAuthorized: true,
      backendReachable: true,
      trust: { serverConfirmed: true, attestationVerified: false },
      riskDetected: false,
      audioAvailable: false,
      analysisInFlight: false,
    };
    const res = deriveCallState(ctx);
    assert.notEqual(res.state, "trusted");
    assert.equal(res.state, "capture_unavailable");
  });

  test("trust null never produces trusted", () => {
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
    const res = deriveCallState(ctx);
    assert.notEqual(res.state, "trusted");
  });
});

describe("deriveCallState - Offline & Unreachable Backend Handling", () => {
  test("in-call with trusted circle when backend is offline produces offline state", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "offline");
    assert.equal(res.label, "Handshake · Offline");
    assert.equal(res.detail, "Cannot reach server to confirm this call.");
  });
});

describe("deriveCallState - Audio & Analysis In-Flight Progress", () => {
  test("audio unavailable surfaces capture_unavailable", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "capture_unavailable");
    assert.equal(res.label, "Handshake · Unable to verify");
    assert.equal(res.detail, "Call audio cannot be accessed for analysis.");
  });

  test("analysis in flight without server confirmation surfaces analyzing", () => {
    const ctx: CallContext = {
      callActive: true,
      hasTrustedCircle: true,
      deviceAuthorized: true,
      backendReachable: true,
      trust: null,
      riskDetected: false,
      audioAvailable: true,
      analysisInFlight: true,
    };
    const res = deriveCallState(ctx);
    assert.equal(res.state, "analyzing");
    assert.equal(res.label, "Handshake · Analyzing…");
    assert.equal(res.detail, "Evaluating trust signals for this call.");
  });

  test("analysis in flight with server confirmation but unverified attestation surfaces verifying", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "verifying");
    assert.equal(res.label, "Handshake · Verifying…");
    assert.equal(res.detail, "Confirming both phones match this call.");
  });

  test("audio available and backend reachable before analysis begins surfaces initializing", () => {
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
    const res = deriveCallState(ctx);
    assert.equal(res.state, "initializing");
    assert.equal(res.label, "Handshake · Initializing…");
    assert.equal(res.detail, "Preparing to verify this call.");
  });
});

describe("deriveCallState - Authorization & Missing Circle", () => {
  test("unpaired caller (no trusted circle) surfaces honest verify instruction", () => {
    const ctx: CallContext = {
      callActive: true,
      hasTrustedCircle: false,
      deviceAuthorized: true,
      backendReachable: true,
      trust: null,
      riskDetected: false,
      audioAvailable: false,
      analysisInFlight: false,
    };
    const res = deriveCallState(ctx);
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Verify");
    assert.equal(res.detail, "Add a trusted person before the call to confirm it automatically.");
  });

  test("revoked device surfaces revocation verify copy", () => {
    const ctx: CallContext = {
      callActive: true,
      hasTrustedCircle: true,
      deviceAuthorized: false,
      backendReachable: true,
      trust: null,
      riskDetected: false,
      audioAvailable: false,
      analysisInFlight: false,
    };
    const res = deriveCallState(ctx);
    assert.equal(res.state, "verify");
    assert.equal(res.label, "Handshake · Verify");
    assert.equal(res.detail, "This phone's trust for this person was revoked.");
  });
});

describe("deriveCallState - Safety Invariant", () => {
  test("no in-call or unverified state ever produces a 'Protected' claim", () => {
    const testCases: CallContext[] = [
      {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: { serverConfirmed: true, attestationVerified: true },
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      },
      {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: false,
        trust: null,
        riskDetected: false,
        audioAvailable: true,
        analysisInFlight: false,
      },
      {
        callActive: true,
        hasTrustedCircle: false,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: false,
        analysisInFlight: false,
      },
      {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: false,
        backendReachable: true,
        trust: null,
        riskDetected: false,
        audioAvailable: false,
        analysisInFlight: false,
      },
      {
        callActive: true,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        backendReachable: true,
        trust: null,
        riskDetected: true,
        audioAvailable: true,
        analysisInFlight: false,
      },
    ];

    for (const ctx of testCases) {
      const decision = deriveCallState(ctx);
      assert.notEqual(decision.state as string, "protected");
      assert.doesNotMatch(decision.label, /^Handshake · Protected$/i);
    }
  });
});
