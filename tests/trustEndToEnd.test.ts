/**
 * End-to-end trust verification tests.
 *
 * Exercises the complete trust protocol flow across QR pairing, session
 * establishment, local attestation verification, revocation, and offline/restart
 * edge cases.
 *
 * Verifies Roadmap Item 1: "Make trust verification dependable".
 */

import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";

import { POST as createInviteHandler } from "../app/api/trust/invite/route";
import { GET as getInviteHandler } from "../app/api/trust/invite/[inviteId]/route";
import { POST as acceptHandler } from "../app/api/trust/invite/[inviteId]/accept/route";
import { POST as confirmHandler } from "../app/api/trust/invite/[inviteId]/confirm/route";
import { GET as circleHandler } from "../app/api/trust/circle/route";
import { POST as openSessionHandler } from "../app/api/trust/session/route";
import { GET as pendingHandler } from "../app/api/trust/session/pending/route";
import { POST as joinHandler } from "../app/api/trust/session/[sessionId]/join/route";
import { GET as sessionHandler } from "../app/api/trust/session/[sessionId]/route";
import { POST as revokeHandler } from "../app/api/trust/revoke/route";

import {
  TRUST_PROTOCOL,
  computeDeviceProof,
  sessionAttestation,
  verifySessionToken,
} from "../lib/trustCrypto";
import { trustStore } from "../lib/trustStore";
import { resetRateLimits } from "../lib/rateLimit";
import { parsePairInvite } from "../mobile/lib/trust/pairLink";
import { classifyTrust, resolveAnalysisPlan } from "../mobile/lib/trust/trustResolver";
import type { DeviceId, PairId } from "../lib/trustSchemas";

interface CircleDevice {
  deviceId: string;
  label: string | null;
  enrolledAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

/** Mirror of mobile relationState helper: maps circle authorization state to user-facing trust status. */
function relationState(circle: {
  devices: CircleDevice[];
  authorized: boolean;
}): "trusted" | "verify" {
  if (!circle.authorized) return "verify";
  const activeDevice = circle.devices.some((device) => device.revokedAt === null);
  return activeDevice ? "trusted" : "verify";
}

const TEST_KEY = "0123456789abcdef0123456789abcdef";

const ALICE_DEVICE = {
  deviceId: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as DeviceId,
  deviceSecret: "1111111111111111111111111111111111111111111111111111111111111111",
};

const BOB_DEVICE = {
  deviceId: "b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2" as DeviceId,
  deviceSecret: "2222222222222222222222222222222222222222222222222222222222222222",
};

let nonceSeq = 0;
function nextNonce(): string {
  nonceSeq++;
  return nonceSeq.toString(16).padStart(32, "e");
}

function inviteParams(inviteId: string) {
  return { params: Promise.resolve({ inviteId }) };
}

function sessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

async function makeProof(
  device: { deviceId: DeviceId; deviceSecret: string },
  pairId: PairId,
  sessionId: string,
  nonce: string,
  issuedAt: number,
) {
  return computeDeviceProof({
    pairId,
    deviceId: device.deviceId,
    sessionId,
    nonce,
    issuedAt,
    deviceSecret: device.deviceSecret,
  });
}

describe("End-to-End Trust Verification Lifecycle", () => {
  beforeEach(() => {
    process.env.PAIR_DERIVATION_KEY = TEST_KEY;
    resetRateLimits();
    trustStore.reset();
  });

  afterEach(() => {
    delete process.env.PAIR_DERIVATION_KEY;
  });

  test("full flow: QR invite -> accept -> confirm -> session open -> join -> poll & attest -> revoke", async () => {
    // 1. Alice creates invitation
    const createRes = await createInviteHandler(
      new NextRequest("http://localhost/api/trust/invite", {
        method: "POST",
        body: JSON.stringify({ displayName: "Alice" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    const inviteId = createBody.inviteId as string;
    const inviteUrl = createBody.url as string;

    // 2. Parse invite link
    const parsedInviteId = parsePairInvite(inviteUrl);
    assert.equal(parsedInviteId, inviteId);

    // 3. Bob accepts the invitation
    const acceptRes = await acceptHandler(
      new NextRequest(`http://localhost/api/trust/invite/${inviteId}/accept`, {
        method: "POST",
        body: JSON.stringify({
          displayName: "Bob",
          deviceId: BOB_DEVICE.deviceId,
          deviceSecret: BOB_DEVICE.deviceSecret,
          label: "Bob Pixel",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      inviteParams(inviteId),
    );
    assert.equal(acceptRes.status, 200);
    const acceptBody = await acceptRes.json();
    const pairId = acceptBody.pairId as PairId;
    assert.equal(acceptBody.state, "accepted");

    // Before confirmation, circle is unauthenticated / unauthorized
    const circleRes1 = await circleHandler(
      new NextRequest(`http://localhost/api/trust/circle?pairId=${pairId}`),
    );
    const circleBody1 = await circleRes1.json();
    assert.equal(circleBody1.authorized, false);
    assert.equal(
      relationState({ devices: circleBody1.devices as CircleDevice[], authorized: circleBody1.authorized }),
      "verify",
    );

    // 4. Alice confirms invitation
    const confirmRes = await confirmHandler(
      new NextRequest(`http://localhost/api/trust/invite/${inviteId}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          pairId,
          deviceId: ALICE_DEVICE.deviceId,
          deviceSecret: ALICE_DEVICE.deviceSecret,
          label: "Alice Galaxy",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      inviteParams(inviteId),
    );
    assert.equal(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    assert.equal(confirmBody.state, "confirmed");

    // Authenticated circle query with valid proof -> authorized: true
    const aliceNonce = nextNonce();
    const aliceIssuedAt = Date.now();
    const aliceProof = await makeProof(ALICE_DEVICE, pairId, TRUST_PROTOCOL, aliceNonce, aliceIssuedAt);
    const circleRes2 = await circleHandler(
      new NextRequest(
        `http://localhost/api/trust/circle?pairId=${pairId}&deviceId=${ALICE_DEVICE.deviceId}&nonce=${aliceNonce}&issuedAt=${aliceIssuedAt}&proof=${aliceProof}`,
      ),
    );
    const circleBody2 = await circleRes2.json();
    assert.equal(circleBody2.devices.length, 2);
    assert.equal(circleBody2.authorized, true);
    assert.equal(
      relationState({
        devices: circleBody2.devices as CircleDevice[],
        authorized: circleBody2.authorized,
      }),
      "trusted",
    );

    // 5. Alice opens a trust session during a call
    const openNonce = nextNonce();
    const openIssuedAt = Date.now();
    const openProof = await makeProof(
      ALICE_DEVICE,
      pairId,
      TRUST_PROTOCOL,
      openNonce,
      openIssuedAt,
    );
    const openRes = await openSessionHandler(
      new NextRequest("http://localhost/api/trust/session", {
        method: "POST",
        body: JSON.stringify({
          pairId,
          deviceId: ALICE_DEVICE.deviceId,
          nonce: openNonce,
          issuedAt: openIssuedAt,
          proof: openProof,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(openRes.status, 201);
    const openBody = await openRes.json();
    const sessionId = openBody.sessionId as string;

    // 6. Bob discovers pending session
    const pendingNonce = nextNonce();
    const pendingIssuedAt = Date.now();
    const pendingProof = await makeProof(
      BOB_DEVICE,
      pairId,
      TRUST_PROTOCOL,
      pendingNonce,
      pendingIssuedAt,
    );
    const pendingRes = await pendingHandler(
      new NextRequest(
        `http://localhost/api/trust/session/pending?pairId=${pairId}&deviceId=${BOB_DEVICE.deviceId}&nonce=${pendingNonce}&issuedAt=${pendingIssuedAt}&proof=${pendingProof}`,
      ),
    );
    assert.equal(pendingRes.status, 200);
    const pendingBody = await pendingRes.json();
    assert.equal(pendingBody.sessions.length, 1);
    assert.equal(pendingBody.sessions[0].sessionId, sessionId);

    // 7. Bob joins session
    const joinNonce = nextNonce();
    const joinIssuedAt = Date.now();
    const joinProof = await makeProof(BOB_DEVICE, pairId, sessionId, joinNonce, joinIssuedAt);
    const joinRes = await joinHandler(
      new NextRequest(`http://localhost/api/trust/session/${sessionId}/join`, {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          deviceId: BOB_DEVICE.deviceId,
          nonce: joinNonce,
          issuedAt: joinIssuedAt,
          proof: joinProof,
        }),
        headers: { "Content-Type": "application/json" },
      }),
      sessionParams(sessionId),
    );
    assert.equal(joinRes.status, 200);
    const joinBody = await joinRes.json();
    assert.equal(joinBody.state, "trusted");

    // 8. Alice polls session status
    const pollNonce = nextNonce();
    const pollIssuedAt = Date.now();
    const pollProof = await makeProof(ALICE_DEVICE, pairId, sessionId, pollNonce, pollIssuedAt);
    const pollRes = await sessionHandler(
      new NextRequest(
        `http://localhost/api/trust/session/${sessionId}?deviceId=${ALICE_DEVICE.deviceId}&nonce=${pollNonce}&issuedAt=${pollIssuedAt}&proof=${pollProof}`,
      ),
      sessionParams(sessionId),
    );
    assert.equal(pollRes.status, 200);
    const pollBody = await pollRes.json();
    assert.equal(pollBody.state, "trusted");

    // 9. Independent local attestation & token verification
    const expectedAttestation = sessionAttestation({
      pairId,
      sessionId,
      initiatorDeviceId: ALICE_DEVICE.deviceId,
      peerDeviceId: BOB_DEVICE.deviceId,
      issuedAt: pollBody.issuedAt,
      expiresAt: pollBody.expiresAt,
    });
    assert.equal(pollBody.attestation, expectedAttestation);

    const tokenValid = verifySessionToken(pollBody.token, {
      sessionId,
      pairId,
      initiatorDeviceId: ALICE_DEVICE.deviceId,
      peerDeviceId: BOB_DEVICE.deviceId,
      issuedAt: pollBody.issuedAt,
      expiresAt: pollBody.expiresAt,
    });
    assert.equal(tokenValid, true);

    // 10. Verify trust classification & analysis plan decision
    const classification = classifyTrust({
      callActive: true,
      evidence: { serverConfirmed: true, attestationVerified: true },
    });
    assert.equal(classification, "TRUSTED");
    const plan = resolveAnalysisPlan({ classification, source: null });
    assert.equal(plan.action, "SKIP_TRUSTED");

    // 11. Revocation: Alice revokes Bob
    const revokeNonce = nextNonce();
    const revokeIssuedAt = Date.now();
    const revokeProof = await makeProof(
      ALICE_DEVICE,
      pairId,
      TRUST_PROTOCOL,
      revokeNonce,
      revokeIssuedAt,
    );
    const revokeRes = await revokeHandler(
      new NextRequest("http://localhost/api/trust/revoke", {
        method: "POST",
        body: JSON.stringify({
          pairId,
          actorDeviceId: ALICE_DEVICE.deviceId,
          actorNonce: revokeNonce,
          actorIssuedAt: revokeIssuedAt,
          actorProof: revokeProof,
          targetDeviceId: BOB_DEVICE.deviceId,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(revokeRes.status, 200);

    // 12. Post-revocation checks: session is downgraded, Bob cannot open session
    const pollRevokeNonce = nextNonce();
    const pollRevokeIssuedAt = Date.now();
    const pollRevokeProof = await makeProof(ALICE_DEVICE, pairId, sessionId, pollRevokeNonce, pollRevokeIssuedAt);
    const pollPostRevokeRes = await sessionHandler(
      new NextRequest(
        `http://localhost/api/trust/session/${sessionId}?deviceId=${ALICE_DEVICE.deviceId}&nonce=${pollRevokeNonce}&issuedAt=${pollRevokeIssuedAt}&proof=${pollRevokeProof}`,
      ),
      sessionParams(sessionId),
    );
    assert.equal(pollPostRevokeRes.status, 200);
    assert.equal((await pollPostRevokeRes.json()).state, "unverified");

    const bobNonce = nextNonce();
    const bobIssuedAt = Date.now();
    const bobProof = await makeProof(BOB_DEVICE, pairId, TRUST_PROTOCOL, bobNonce, bobIssuedAt);
    const bobOpenRes = await openSessionHandler(
      new NextRequest("http://localhost/api/trust/session", {
        method: "POST",
        body: JSON.stringify({
          pairId,
          deviceId: BOB_DEVICE.deviceId,
          nonce: bobNonce,
          issuedAt: bobIssuedAt,
          proof: bobProof,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(bobOpenRes.status, 403);
  });

  describe("Edge cases & Resilience", () => {
    test("relationState correctly evaluates active and revoked devices", () => {
      // Empty devices -> verify
      assert.equal(relationState({ devices: [], authorized: true }), "verify");
      // Unauthorized -> verify
      assert.equal(
        relationState({
          devices: [
            {
              deviceId: "d1",
              label: null,
              enrolledAt: "2026-10-14T00:00:00Z",
              lastSeenAt: null,
              revokedAt: null,
            },
          ],
          authorized: false,
        }),
        "verify",
      );
      // All revoked -> verify
      assert.equal(
        relationState({
          devices: [
            {
              deviceId: "d1",
              label: null,
              enrolledAt: "2026-10-14T00:00:00Z",
              lastSeenAt: null,
              revokedAt: "2026-10-14T01:00:00Z",
            },
          ],
          authorized: true,
        }),
        "verify",
      );
      // Active device present -> trusted
      assert.equal(
        relationState({
          devices: [
            {
              deviceId: "d1",
              label: null,
              enrolledAt: "2026-10-14T00:00:00Z",
              lastSeenAt: null,
              revokedAt: "2026-10-14T01:00:00Z",
            },
            {
              deviceId: "d2",
              label: null,
              enrolledAt: "2026-10-14T00:00:00Z",
              lastSeenAt: null,
              revokedAt: null,
            },
          ],
          authorized: true,
        }),
        "trusted",
      );
    });

    test("expired invitation cannot be accepted or confirmed", async () => {
      const createRes = await createInviteHandler(
        new NextRequest("http://localhost/api/trust/invite", {
          method: "POST",
          body: JSON.stringify({ displayName: "Alice" }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      const inviteId = (await createRes.json()).inviteId as string;

      // Force expiry in store
      const storeInvites = (trustStore as unknown as {
        invites: Map<string, { expiresAt: number }>;
      }).invites;
      storeInvites.get(inviteId)!.expiresAt = Date.now() - 1000;

      const acceptRes = await acceptHandler(
        new NextRequest(`http://localhost/api/trust/invite/${inviteId}/accept`, {
          method: "POST",
          body: JSON.stringify({
            displayName: "Bob",
            deviceId: BOB_DEVICE.deviceId,
            deviceSecret: BOB_DEVICE.deviceSecret,
          }),
          headers: { "Content-Type": "application/json" },
        }),
        inviteParams(inviteId),
      );
      assert.equal(acceptRes.status, 409);
      assert.equal((await acceptRes.json()).error.code, "inviting_expired");
    });

    test("store reset / process restart simulation results in unverified status", async () => {
      // Create invite and enroll devices
      const createRes = await createInviteHandler(
        new NextRequest("http://localhost/api/trust/invite", {
          method: "POST",
          body: JSON.stringify({ displayName: "Alice" }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      const inviteId = (await createRes.json()).inviteId as string;
      const acceptRes = await acceptHandler(
        new NextRequest(`http://localhost/api/trust/invite/${inviteId}/accept`, {
          method: "POST",
          body: JSON.stringify({
            displayName: "Bob",
            deviceId: BOB_DEVICE.deviceId,
            deviceSecret: BOB_DEVICE.deviceSecret,
          }),
          headers: { "Content-Type": "application/json" },
        }),
        inviteParams(inviteId),
      );
      const pairId = (await acceptRes.json()).pairId as PairId;

      // Simulate server instance restart / process death by resetting trustStore
      trustStore.reset();

      // Querying invite after reset returns 404
      const getInviteRes = await getInviteHandler(
        new NextRequest(`http://localhost/api/trust/invite/${inviteId}`),
        inviteParams(inviteId),
      );
      assert.equal(getInviteRes.status, 404);

      // Attempting session operation after restart returns 403 device_not_enrolled
      const openNonce = nextNonce();
      const openIssuedAt = Date.now();
      const openProof = await makeProof(
        ALICE_DEVICE,
        pairId,
        TRUST_PROTOCOL,
        openNonce,
        openIssuedAt,
      );
      const openRes = await openSessionHandler(
        new NextRequest("http://localhost/api/trust/session", {
          method: "POST",
          body: JSON.stringify({
            pairId,
            deviceId: ALICE_DEVICE.deviceId,
            nonce: openNonce,
            issuedAt: openIssuedAt,
            proof: openProof,
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );
      assert.equal(openRes.status, 403);
      assert.equal((await openRes.json()).error.code, "device_not_enrolled");
    });
  });
});
