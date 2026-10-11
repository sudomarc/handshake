/**
 * Trust session and relation end-to-end unit tests.
 *
 * Guarantees under test:
 *   1. `relationState` requires an authorized circle with at least one non-revoked device.
 *   2. `verifySessionTrust` strictly checks server confirmation AND attestation signature.
 *   3. `runCallTrust` returns `trusted` only when server confirms AND local attestation matches;
 *      all network failures, unverified attestations, or timeouts resolve to honest `offline`/`capture_unavailable`/`verify`.
 */

// Set API base URL environment variable before importing mobile modules
process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  relationState,
  verifySessionTrust,
  type SessionStatus,
  type CircleDevice,
} from "../mobile/lib/trust/api";
import { runCallTrust } from "../mobile/lib/trust/session";
import { computeAttestation } from "../mobile/lib/trust/proof";

const PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const INITIATOR_DEV = "11111111111111111111111111111111";
const PEER_DEV = "22222222222222222222222222222222";
const SESSION_ID = "s1s2s3s4s5s6s7s8s9s0s1s2s3s4s5s6";

describe("relationState", () => {
  test("returns verify if circle is not authorized", () => {
    const devices: CircleDevice[] = [
      {
        deviceId: INITIATOR_DEV,
        label: "Phone A",
        enrolledAt: "2026-10-10T00:00:00Z",
        lastSeenAt: null,
        revokedAt: null,
      },
    ];
    assert.equal(relationState({ authorized: false, devices }), "verify");
  });

  test("returns verify if all enrolled devices are revoked", () => {
    const devices: CircleDevice[] = [
      {
        deviceId: INITIATOR_DEV,
        label: "Phone A",
        enrolledAt: "2026-10-10T00:00:00Z",
        lastSeenAt: null,
        revokedAt: "2026-10-10T01:00:00Z",
      },
    ];
    assert.equal(relationState({ authorized: true, devices }), "verify");
  });

  test("returns trusted when circle is authorized and at least one device is active", () => {
    const devices: CircleDevice[] = [
      {
        deviceId: INITIATOR_DEV,
        label: "Phone A",
        enrolledAt: "2026-10-10T00:00:00Z",
        lastSeenAt: null,
        revokedAt: "2026-10-10T01:00:00Z",
      },
      {
        deviceId: PEER_DEV,
        label: "Phone B",
        enrolledAt: "2026-10-10T00:00:00Z",
        lastSeenAt: null,
        revokedAt: null,
      },
    ];
    assert.equal(relationState({ authorized: true, devices }), "trusted");
  });
});

describe("verifySessionTrust", () => {
  test("returns serverConfirmed=false if session state is unverified", async () => {
    const status: SessionStatus = {
      sessionId: SESSION_ID,
      pairId: PAIR_ID,
      state: "unverified",
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: PEER_DEV,
      attestation: null,
      issuedAt: 1000,
      expiresAt: 2000,
    };
    const res = await verifySessionTrust({ pairId: PAIR_ID, status });
    assert.deepEqual(res, { serverConfirmed: false, attestationVerified: false });
  });

  test("returns serverConfirmed=false if peerDeviceId is null", async () => {
    const status: SessionStatus = {
      sessionId: SESSION_ID,
      pairId: PAIR_ID,
      state: "trusted",
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: null,
      attestation: "dummy",
      issuedAt: 1000,
      expiresAt: 2000,
    };
    const res = await verifySessionTrust({ pairId: PAIR_ID, status });
    assert.deepEqual(res, { serverConfirmed: false, attestationVerified: false });
  });

  test("returns attestationVerified=false if attestation string is missing", async () => {
    const status: SessionStatus = {
      sessionId: SESSION_ID,
      pairId: PAIR_ID,
      state: "trusted",
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: PEER_DEV,
      attestation: null,
      issuedAt: 1000,
      expiresAt: 2000,
    };
    const res = await verifySessionTrust({ pairId: PAIR_ID, status });
    assert.deepEqual(res, { serverConfirmed: true, attestationVerified: false });
  });

  test("verifies attestation signature correctly", async () => {
    const issuedAt = 1000;
    const expiresAt = 2000;
    const validAttestation = await computeAttestation({
      pairId: PAIR_ID,
      sessionId: SESSION_ID,
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: PEER_DEV,
      issuedAt,
      expiresAt,
    });

    const status: SessionStatus = {
      sessionId: SESSION_ID,
      pairId: PAIR_ID,
      state: "trusted",
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: PEER_DEV,
      attestation: validAttestation,
      issuedAt,
      expiresAt,
    };
    const res = await verifySessionTrust({ pairId: PAIR_ID, status });
    assert.deepEqual(res, { serverConfirmed: true, attestationVerified: true });

    // Invalid attestation fails verification
    const invalidStatus = { ...status, attestation: "f".repeat(64) };
    const invalidRes = await verifySessionTrust({ pairId: PAIR_ID, status: invalidStatus });
    assert.deepEqual(invalidRes, { serverConfirmed: true, attestationVerified: false });
  });
});

describe("runCallTrust", () => {
  test("returns verify immediately if hasTrustedCircle is false", async () => {
    const progress: string[] = [];
    const res = await runCallTrust({
      pairId: PAIR_ID,
      role: "initiator",
      hasTrustedCircle: false,
      deviceAuthorized: true,
      riskDetected: false,
      onProgress: (p) => progress.push(p.state),
    });

    assert.equal(res.state, "verify");
    assert.equal(res.backendReachable, true);
    assert.equal(res.sessionAttempted, false);
    assert.equal(res.sessionId, null);
    assert.equal(progress.length, 1);
  });

  test("handles backend offline error gracefully (TrustNetworkError) by returning offline state", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    try {
      const res = await runCallTrust({
        pairId: PAIR_ID,
        role: "initiator",
        hasTrustedCircle: true,
        deviceAuthorized: true,
        riskDetected: false,
      });

      assert.equal(res.state, "offline");
      assert.equal(res.backendReachable, false);
      assert.equal(res.sessionId, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("times out to capture_unavailable if peer does not join within budget", async () => {
    const originalFetch = globalThis.fetch;
    let pollCount = 0;

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/trust/session") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            sessionId: SESSION_ID,
            pairId: PAIR_ID,
            challengeNonce: "n".repeat(32),
            openedByDeviceId: INITIATOR_DEV,
            issuedAt: Date.now(),
            expiresAt: Date.now() + 300000,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes(`/api/trust/session/${SESSION_ID}`)) {
        pollCount++;
        return new Response(
          JSON.stringify({
            sessionId: SESSION_ID,
            pairId: PAIR_ID,
            state: "unverified",
            initiatorDeviceId: INITIATOR_DEV,
            peerDeviceId: null,
            attestation: null,
            issuedAt: Date.now(),
            expiresAt: Date.now() + 300000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    };

    let clock = 1000000;
    const now = () => clock;
    const sleep = async (ms: number) => {
      clock += ms;
    };

    try {
      const res = await runCallTrust({
        pairId: PAIR_ID,
        role: "initiator",
        hasTrustedCircle: true,
        deviceAuthorized: true,
        riskDetected: false,
        timeoutMs: 3000,
        pollIntervalMs: 1000,
        now,
        sleep,
      });

      assert.equal(res.state, "capture_unavailable");
      assert.equal(res.backendReachable, true);
      assert.equal(res.sessionAttempted, true);
      assert.equal(res.sessionId, SESSION_ID);
      assert.ok(pollCount > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("reaches trusted state when peer joins and attestation verifies", async () => {
    const originalFetch = globalThis.fetch;
    const issuedAt = 1000000;
    const expiresAt = 1000000 + 300000;
    const attestation = await computeAttestation({
      pairId: PAIR_ID,
      sessionId: SESSION_ID,
      initiatorDeviceId: INITIATOR_DEV,
      peerDeviceId: PEER_DEV,
      issuedAt,
      expiresAt,
    });

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/trust/session") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            sessionId: SESSION_ID,
            pairId: PAIR_ID,
            challengeNonce: "n".repeat(32),
            openedByDeviceId: INITIATOR_DEV,
            issuedAt,
            expiresAt,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes(`/api/trust/session/${SESSION_ID}`)) {
        return new Response(
          JSON.stringify({
            sessionId: SESSION_ID,
            pairId: PAIR_ID,
            state: "trusted",
            initiatorDeviceId: INITIATOR_DEV,
            peerDeviceId: PEER_DEV,
            attestation,
            issuedAt,
            expiresAt,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    };

    try {
      const res = await runCallTrust({
        pairId: PAIR_ID,
        role: "initiator",
        hasTrustedCircle: true,
        deviceAuthorized: true,
        riskDetected: false,
      });

      assert.equal(res.state, "trusted");
      assert.equal(res.backendReachable, true);
      assert.equal(res.peerDeviceId, PEER_DEV);
      assert.equal(res.sessionId, SESSION_ID);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
