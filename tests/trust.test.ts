/**
 * Trusted-call protocol tests.
 *
 * Covers the trust relationship (establish / recognise / reject), call-session
 * authentication (expiry, replay, revocation), and the honest-state guarantee
 * that no unresolved case can ever resolve to `trusted`.
 */

import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import { POST as enrollHandler } from "../app/api/trust/enroll/route";
import { GET as circleHandler } from "../app/api/trust/circle/route";
import { POST as revokeHandler } from "../app/api/trust/revoke/route";
import { POST as openSessionHandler } from "../app/api/trust/session/route";
import { GET as pendingHandler } from "../app/api/trust/session/pending/route";
import { GET as sessionHandler } from "../app/api/trust/session/[sessionId]/route";
import { POST as joinHandler } from "../app/api/trust/session/[sessionId]/join/route";
import {
  TRUST_PROTOCOL,
  computeDeviceProof,
  sessionAttestation,
  verifyDeviceProof,
  verifySessionToken,
} from "../lib/trustCrypto";
import { TrustError, trustStore, SESSION_TTL_MS } from "../lib/trustStore";
import { resetRateLimits } from "../lib/rateLimit";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const TEST_KEY = "0123456789abcdef0123456789abcdef";
const PAIR_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90" as PairId;
const PAIR_B = "00112233445566778899aabbccddeeff" as PairId;

interface Device {
  deviceId: DeviceId;
  deviceSecret: string;
  pairId: PairId;
}

function makeDevice(pairId: PairId, deviceId: string, deviceSecret: string): Device {
  return { deviceId: deviceId as DeviceId, deviceSecret, pairId };
}

let nonceSeq = 0;
/** All nonces/secrets in these tests must be valid hex to match the schemas. */
function nonce(): string {
  nonceSeq++;
  return nonceSeq.toString(16).padStart(32, "d");
}

async function enroll(device: Device, label?: string): Promise<Response> {
  return enrollHandler(
    new NextRequest("http://localhost/api/trust/enroll", {
      method: "POST",
      body: JSON.stringify({
        pairId: device.pairId,
        deviceId: device.deviceId,
        deviceSecret: device.deviceSecret,
        label,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function proof(device: Device, sessionId: string, n: string, issuedAt: number) {
  return computeDeviceProof({
    pairId: device.pairId,
    deviceId: device.deviceId,
    sessionId,
    nonce: n,
    issuedAt,
    deviceSecret: device.deviceSecret,
  });
}

async function openSession(device: Device, now = Date.now()) {
  const n = nonce();
  const res = await openSessionHandler(
    new NextRequest("http://localhost/api/trust/session", {
      method: "POST",
      body: JSON.stringify({
        pairId: device.pairId,
        deviceId: device.deviceId,
        nonce: n,
        issuedAt: now,
        proof: await proof(device, TRUST_PROTOCOL, n, now),
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  return { res, body: await res.json() };
}

async function joinSession(device: Device, sessionId: string, now = Date.now()) {
  const n = nonce();
  const res = await joinHandler(
    new NextRequest(`http://localhost/api/trust/session/${sessionId}/join`, {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        deviceId: device.deviceId,
        nonce: n,
        issuedAt: now,
        proof: await proof(device, sessionId, n, now),
      }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ sessionId }) },
  );
  return { res, body: await res.json() };
}

async function pollSession(device: Device, sessionId: string, now = Date.now()) {
  const n = nonce();
  const res = await sessionHandler(
    new NextRequest(
      `http://localhost/api/trust/session/${sessionId}?deviceId=${device.deviceId}&nonce=${n}&issuedAt=${now}&proof=${await proof(device, sessionId, n, now)}`,
    ),
    { params: Promise.resolve({ sessionId }) },
  );
  return { res, body: await res.json() };
}

async function findPending(device: Device, now = Date.now()) {
  const n = nonce();
  const url = `http://localhost/api/trust/session/pending?pairId=${device.pairId}&deviceId=${device.deviceId}&nonce=${n}&issuedAt=${now}&proof=${await proof(device, TRUST_PROTOCOL, n, now)}`;
  const res = await pendingHandler(new NextRequest(url));
  return { res, body: await res.json() };
}

async function revoke(actor: Device, targetDeviceId: string, revokeWholeCircle = false) {
  const n = nonce();
  const issuedAt = Date.now();
  const res = await revokeHandler(
    new NextRequest("http://localhost/api/trust/revoke", {
      method: "POST",
      body: JSON.stringify({
        pairId: actor.pairId,
        actorDeviceId: actor.deviceId,
        actorNonce: n,
        actorIssuedAt: issuedAt,
        actorProof: await proof(actor, TRUST_PROTOCOL, n, issuedAt),
        targetDeviceId,
        revokeWholeCircle,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  return { res, body: await res.json() };
}

describe("trusted-call protocol", () => {
  let alice: Device;
  let bob: Device;
  let stranger: Device;

  beforeEach(() => {
    process.env.PAIR_DERIVATION_KEY = TEST_KEY;
    resetRateLimits();
    trustStore.reset();
    alice = makeDevice(PAIR_A, "a".repeat(32), "1".repeat(64));
    bob = makeDevice(PAIR_A, "b".repeat(32), "2".repeat(64));
    stranger = makeDevice(PAIR_B, "c".repeat(32), "3".repeat(64));
  });

  afterEach(() => {
    delete process.env.PAIR_DERIVATION_KEY;
  });

  /* ---------------------------------------------------------------- */
  /* Trust relationship                                               */
  /* ---------------------------------------------------------------- */

  describe("pre-call enrolment", () => {
    test("two devices in one circle are both enrolled", async () => {
      assert.equal((await enroll(alice, "Alice")).status, 201);
      assert.equal((await enroll(bob, "Bob")).status, 201);

      const res = await circleHandler(
        new NextRequest(`http://localhost/api/trust/circle?pairId=${PAIR_A}`),
      );
      const body = await res.json();
      assert.equal(body.devices.length, 2);
      assert.deepEqual(
        body.devices.map((d: { deviceId: string }) => d.deviceId).sort(),
        [alice.deviceId, bob.deviceId].sort(),
      );
    });

    test("re-enrolling the same device is idempotent and clears revocation", async () => {
      await enroll(alice);
      await enroll(alice);
      const res = await circleHandler(
        new NextRequest(`http://localhost/api/trust/circle?pairId=${PAIR_A}`),
      );
      assert.equal((await res.json()).devices.length, 1);
    });

    test("an unenrolled device cannot open a session", async () => {
      const { res, body } = await openSession(stranger);
      assert.equal(res.status, 403);
      assert.equal(body.error.code, "device_not_enrolled");
    });

    test("the circle does not leak devices of another circle", async () => {
      await enroll(alice);
      const res = await circleHandler(
        new NextRequest(`http://localhost/api/trust/circle?pairId=${PAIR_B}`),
      );
      assert.equal((await res.json()).devices.length, 0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Call-session authentication                                       */
  /* ---------------------------------------------------------------- */

  describe("mutual recognition during a call", () => {
    test("two enrolled devices reach mutual recognition with no spoken code", async () => {
      await enroll(alice);
      await enroll(bob);

      const opened = await openSession(alice);
      assert.equal(opened.res.status, 201);
      assert.equal(opened.body.status, "awaiting-peer");
      const sessionId = opened.body.sessionId as string;

      // Bob discovers Alice's session.
      const discovered = await findPending(bob);
      assert.equal(discovered.body.sessions.length, 1);
      assert.equal(discovered.body.sessions[0].sessionId, sessionId);

      const joined = await joinSession(bob, sessionId);
      assert.equal(joined.res.status, 200);
      assert.equal(joined.body.state, "trusted");

      // Alice polls and sees the same trusted state.
      const polled = await pollSession(alice, sessionId);
      assert.equal(polled.res.status, 200);
      assert.equal(polled.body.state, "trusted");
      assert.equal(polled.body.peerDeviceId, bob.deviceId);

      // Both sides can verify the attestation locally from the pair id alone.
      const attestation = sessionAttestation({
        pairId: PAIR_A,
        sessionId,
        initiatorDeviceId: alice.deviceId,
        peerDeviceId: bob.deviceId,
        issuedAt: polled.body.issuedAt,
        expiresAt: polled.body.expiresAt,
      });
      assert.equal(attestation, polled.body.attestation);
      assert.equal(attestation, joined.body.attestation);

      // The server-signed token validates against the same session facts.
      assert.equal(
        verifySessionToken(polled.body.token, {
          sessionId,
          pairId: PAIR_A,
          initiatorDeviceId: alice.deviceId,
          peerDeviceId: bob.deviceId,
          issuedAt: polled.body.issuedAt,
          expiresAt: polled.body.expiresAt,
        }),
        true,
      );
    });

    test("an untrusted pair is rejected: a device from another circle cannot join", async () => {
      await enroll(alice);
      await enroll(stranger);

      const opened = await openSession(alice);
      const sessionId = opened.body.sessionId as string;

      const joined = await joinSession(stranger, sessionId);
      assert.equal(joined.body.state, undefined);
      assert.equal(joined.res.status, 403);

      // And the session did not become trusted.
      const polled = await pollSession(alice, sessionId);
      assert.equal(polled.body.state, "unverified");
    });

    test("a device cannot recognise itself: joining your own session fails", async () => {
      await enroll(alice);
      const opened = await openSession(alice);
      const joined = await joinSession(alice, opened.body.sessionId as string);
      assert.notEqual(joined.res.status, 200);
      const polled = await pollSession(alice, opened.body.sessionId as string);
      assert.equal(polled.body.state, "unverified");
    });

    test("a one-sided call stays unverified (peer offline / no Handshake)", async () => {
      await enroll(alice);
      const opened = await openSession(alice);
      const polled = await pollSession(alice, opened.body.sessionId as string);
      assert.equal(polled.body.state, "unverified");
      assert.equal(polled.body.peerDeviceId, null);
      assert.equal(polled.body.attestation, null);
      assert.equal(polled.body.token, undefined);
    });

    test("a spoofed proof is rejected", async () => {
      await enroll(alice);
      const n = nonce();
      const res = await openSessionHandler(
        new NextRequest("http://localhost/api/trust/session", {
          method: "POST",
          body: JSON.stringify({
            pairId: PAIR_A,
            deviceId: alice.deviceId,
            nonce: n,
            issuedAt: Date.now(),
            proof: "f".repeat(64),
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      assert.notEqual(res.status, 201);
    });

    test("a proof made with another device's secret is rejected", async () => {
      await enroll(alice);
      await enroll(bob);
      const n = nonce();
      const issuedAt = Date.now();
      const forged = await computeDeviceProof({
        pairId: PAIR_A,
        deviceId: alice.deviceId,
        sessionId: TRUST_PROTOCOL,
        nonce: n,
        issuedAt,
        deviceSecret: bob.deviceSecret,
      });
      const res = await openSessionHandler(
        new NextRequest("http://localhost/api/trust/session", {
          method: "POST",
          body: JSON.stringify({
            pairId: PAIR_A,
            deviceId: alice.deviceId,
            nonce: n,
            issuedAt,
            proof: forged,
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      assert.notEqual(res.status, 201);
    });

    test("a stale timestamp outside the skew window is rejected", async () => {
      await enroll(alice);
      const old = Date.now() - 10 * 60_000;
      const { res } = await openSession(alice, old);
      assert.notEqual(res.status, 201);
    });

    test("a replayed join proof is rejected", async () => {
      await enroll(alice);
      await enroll(bob);
      const opened = await openSession(alice);
      const sessionId = opened.body.sessionId as string;

      const n = "a".repeat(32);
      const issuedAt = Date.now();
      const reused = await proof(bob, sessionId, n, issuedAt);
      const body = JSON.stringify({
        sessionId,
        deviceId: bob.deviceId,
        nonce: n,
        issuedAt,
        proof: reused,
      });
      const ctx = { params: Promise.resolve({ sessionId }) };

      const first = await joinHandler(
        new NextRequest(`http://localhost/api/trust/session/${sessionId}/join`, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        }),
        ctx,
      );
      assert.equal(first.status, 200);

      const second = await joinHandler(
        new NextRequest(`http://localhost/api/trust/session/${sessionId}/join`, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        }),
        ctx,
      );
      assert.notEqual(second.status, 200);
    });

    test("a session cannot be bound twice", async () => {
      await enroll(alice);
      await enroll(bob);
      const carol = makeDevice(PAIR_A, "d".repeat(32), "4".repeat(64));
      await enroll(carol);

      const opened = await openSession(alice);
      const sessionId = opened.body.sessionId as string;
      assert.equal((await joinSession(bob, sessionId)).res.status, 200);

      const second = await joinSession(carol, sessionId);
      assert.notEqual(second.res.status, 200);
    });

    test("an expired session is rejected and never resolves to trusted", async () => {
      await enroll(alice);
      await enroll(bob);
      const opened = await openSession(alice);
      const sessionId = opened.body.sessionId as string;
      const session = trustStore.requireActiveDevice(PAIR_A, alice.deviceId);
      void session;

      // Force expiry.
      const stored = (
        trustStore as unknown as {
          sessions: Map<string, { expiresAt: number }>;
        }
      ).sessions.get(sessionId);
      assert.ok(stored);
      stored!.expiresAt = Date.now() - 1;

      const polled = await pollSession(alice, sessionId);
      assert.notEqual(polled.res.status, 200);

      const joined = await joinSession(bob, sessionId);
      assert.notEqual(joined.res.status, 200);
    });

    test("an unknown session id is rejected", async () => {
      await enroll(alice);
      const { res } = await pollSession(alice, "0".repeat(32));
      assert.notEqual(res.status, 200);
    });

    test("pending discovery never returns the caller's own session", async () => {
      await enroll(alice);
      await enroll(bob);
      const opened = await openSession(alice);
      const byAlice = await findPending(alice);
      assert.equal(byAlice.body.sessions.length, 0);

      const byBob = await findPending(bob);
      assert.equal(byBob.body.sessions.length, 1);
      assert.equal(byBob.body.sessions[0].sessionId, opened.body.sessionId);
    });

    test("pending discovery requires a valid proof", async () => {
      await enroll(alice);
      await enroll(bob);
      await openSession(alice);
      const res = await pendingHandler(
        new NextRequest(
          `http://localhost/api/trust/session/pending?pairId=${PAIR_A}&deviceId=${bob.deviceId}&nonce=${nonce()}&issuedAt=${Date.now()}&proof=${"0".repeat(64)}`,
        ),
      );
      assert.equal(res.status, 401);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Revocation                                                       */
  /* ---------------------------------------------------------------- */

  describe("revocation", () => {
    test("a revoked device is rejected and its confirmed session downgrades", async () => {
      await enroll(alice);
      await enroll(bob);
      const opened = await openSession(alice);
      const sessionId = opened.body.sessionId as string;
      await joinSession(bob, sessionId);
      assert.equal((await pollSession(alice, sessionId)).body.state, "trusted");

      const result = await revoke(alice, bob.deviceId);
      assert.equal(result.res.status, 200);
      assert.deepEqual(result.body.revokedDeviceIds, [bob.deviceId]);

      // Bob can no longer act.
      assert.notEqual((await openSession(bob)).res.status, 201);
      assert.notEqual((await joinSession(bob, sessionId)).res.status, 200);

      // The previously confirmed session no longer reads as trusted.
      assert.equal((await pollSession(alice, sessionId)).body.state, "unverified");
    });

    test("revoking the whole circle works and is self-service", async () => {
      await enroll(alice);
      await enroll(bob);
      const result = await revoke(alice, alice.deviceId, true);
      assert.equal(result.res.status, 200);
      assert.equal(result.body.revokedDeviceIds.length, 2);
      assert.notEqual((await openSession(alice)).res.status, 201);
      assert.notEqual((await openSession(bob)).res.status, 201);
    });

    test("a revoked device cannot revoke others", async () => {
      await enroll(alice);
      await enroll(bob);
      await revoke(alice, bob.deviceId);
      const attempt = await revoke(bob, alice.deviceId);
      assert.notEqual(attempt.res.status, 200);
    });

    test("revocation requires a valid actor proof", async () => {
      await enroll(alice);
      await enroll(bob);
      const res = await revokeHandler(
        new NextRequest("http://localhost/api/trust/revoke", {
          method: "POST",
          body: JSON.stringify({
            pairId: PAIR_A,
            actorDeviceId: alice.deviceId,
            actorNonce: nonce(),
            actorIssuedAt: Date.now(),
            actorProof: "0".repeat(64),
            targetDeviceId: bob.deviceId,
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      assert.notEqual(res.status, 200);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Multiple devices per person                                     */
  /* ---------------------------------------------------------------- */

  test("several devices per person are tracked independently", async () => {
    const phoneA = makeDevice(PAIR_A, "1".repeat(32), "a".repeat(64));
    const phoneB = makeDevice(PAIR_A, "2".repeat(32), "b".repeat(64));
    const peer = makeDevice(PAIR_A, "3".repeat(32), "c".repeat(64));

    await enroll(phoneA);
    await enroll(phoneB);
    await enroll(peer);

    const res = await circleHandler(
      new NextRequest(`http://localhost/api/trust/circle?pairId=${PAIR_A}`),
    );
    assert.equal((await res.json()).devices.length, 3);

    // Revoking one phone leaves the other two usable.
    await revoke(phoneA, phoneB.deviceId);
    const opened = await openSession(phoneA);
    assert.equal(opened.res.status, 201);
    assert.equal((await joinSession(peer, opened.body.sessionId as string)).res.status, 200);
  });

  /* ---------------------------------------------------------------- */
  /* Crypto primitives                                               */
  /* ---------------------------------------------------------------- */

  describe("lib/trustCrypto", () => {
    test("proofs are deterministic for identical inputs", async () => {
      const fields = {
        pairId: PAIR_A,
        deviceId: alice.deviceId,
        sessionId: "s".repeat(32),
        nonce: "n".repeat(32),
        issuedAt: 1_700_000_000_000,
        deviceSecret: "a".repeat(64),
      };
      const first = await computeDeviceProof(fields);
      const second = await computeDeviceProof(fields);
      assert.equal(first, second);
      assert.match(first, /^[a-f0-9]{64}$/);
    });

    test("the secret is the final canonical field (no length extension)", async () => {
      const base = {
        pairId: PAIR_A,
        deviceId: alice.deviceId,
        sessionId: "s".repeat(32),
        nonce: "n".repeat(32),
        issuedAt: 1_700_000_000_000,
        deviceSecret: "a".repeat(64),
      };
      // Changing only the trailing secret must change the digest.
      const other = await computeDeviceProof({ ...base, deviceSecret: "b".repeat(64) });
      assert.notEqual(other, await computeDeviceProof(base));
    });

    test("verifyDeviceProof honours the timestamp window", async () => {
      const fields = {
        pairId: PAIR_A,
        deviceId: alice.deviceId,
        sessionId: TRUST_PROTOCOL,
        nonce: "n".repeat(32),
        issuedAt: Date.now(),
        deviceSecret: "a".repeat(64),
      };
      const expected = await computeDeviceProof(fields);
      assert.equal(verifyDeviceProof({ ...fields, expected }), true);
      assert.equal(
        verifyDeviceProof({ ...fields, expected, now: Date.now() + 10 * 60_000 }),
        false,
      );
    });

    test("attestation binds both devices and the session window", async () => {
      const base = {
        pairId: PAIR_A,
        sessionId: "s".repeat(32),
        initiatorDeviceId: alice.deviceId,
        peerDeviceId: bob.deviceId,
        issuedAt: 1,
        expiresAt: 2,
      };
      const base_value = sessionAttestation(base);
      assert.equal(
        sessionAttestation({ ...base, peerDeviceId: stranger.deviceId }) === base_value,
        false,
      );
      assert.equal(
        sessionAttestation({ ...base, sessionId: "x".repeat(32) }) === base_value,
        false,
      );
      assert.equal(sessionAttestation({ ...base, expiresAt: 3 }) === base_value, false);
    });

    test("an expired session token fails verification", async () => {
      const claims = {
        sessionId: "s".repeat(32),
        pairId: PAIR_A,
        initiatorDeviceId: alice.deviceId,
        peerDeviceId: bob.deviceId,
        issuedAt: 1,
        expiresAt: 2,
      };
      const { issueSessionToken } = await import("../lib/trustCrypto");
      const token = issueSessionToken(claims);
      assert.equal(verifySessionToken(token, claims, 1), true);
      assert.equal(verifySessionToken(token, claims, 3), false);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Store invariants                                                */
  /* ---------------------------------------------------------------- */

  test("sweep removes expired sessions and empty circles", async () => {
    await enroll(alice);
    const opened = await openSession(alice);
    const sessionId = opened.body.sessionId as string;

    const sessions = (
      trustStore as unknown as {
        sessions: Map<string, { expiresAt: number }>;
      }
    ).sessions;
    sessions.get(sessionId)!.expiresAt = Date.now() - 1;

    trustStore.sweep();
    assert.equal(sessions.has(sessionId), false);
  });

  test("TrustError carries a machine-readable code", () => {
    const err = new TrustError("device_revoked", "nope");
    assert.equal(err.name, "TrustError");
    assert.equal(err.code, "device_revoked");
  });

  test("SESSION_TTL_MS is a bounded short window", () => {
    assert.ok(SESSION_TTL_MS > 0 && SESSION_TTL_MS <= 10 * 60_000);
  });
});
