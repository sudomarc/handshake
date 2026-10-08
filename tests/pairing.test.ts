/**
 * QR pairing invitation tests.
 *
 * Covers the full two-confirmation pairing lifecycle — create → accept → confirm –
 * plus the single-use and expiry invariants of the invite id: an invite can be
 * accepted at most once, confirmed at most once, and never after expiry.
 */

import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import { POST as createInviteHandler } from "../app/api/trust/invite/route";
import { GET as getInviteHandler } from "../app/api/trust/invite/[inviteId]/route";
import { POST as acceptHandler } from "../app/api/trust/invite/[inviteId]/accept/route";
import { POST as confirmHandler } from "../app/api/trust/invite/[inviteId]/confirm/route";
import { GET as qrHandler } from "../app/api/trust/invite/[inviteId]/qr/route";
import { GET as circleHandler } from "../app/api/trust/circle/route";
import { trustStore } from "../lib/trustStore";
import { resetRateLimits } from "../lib/rateLimit";
import { parsePairInvite } from "../mobile/lib/trust/parseInvite";

const TEST_KEY = "0123456789abcdef0123456789abcdef";
const OWNER = { deviceId: "a".repeat(32), deviceSecret: "1".repeat(64) };
const PEER = { deviceId: "b".repeat(32), deviceSecret: "2".repeat(64) };

function inviteParams(inviteId: string) {
  return { params: Promise.resolve({ inviteId }) };
}

async function createInvite(displayName = "Alice") {
  const res = await createInviteHandler(
    new NextRequest("http://localhost/api/trust/invite", {
      method: "POST",
      body: JSON.stringify({ displayName }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  return { res, body: await res.json() };
}

async function getInvite(inviteId: string) {
  const res = await getInviteHandler(
    new NextRequest(`http://localhost/api/trust/invite/${inviteId}`),
    inviteParams(inviteId),
  );
  return { res, body: await res.json() };
}

async function acceptInvite(
  inviteId: string,
  displayName: string,
  device: { deviceId: string; deviceSecret: string },
  label?: string,
) {
  const res = await acceptHandler(
    new NextRequest(`http://localhost/api/trust/invite/${inviteId}/accept`, {
      method: "POST",
      body: JSON.stringify({ displayName, ...device, label }),
      headers: { "Content-Type": "application/json" },
    }),
    inviteParams(inviteId),
  );
  return { res, body: await res.json() };
}

async function confirmInvite(
  inviteId: string,
  pairId: string,
  device: { deviceId: string; deviceSecret: string },
  label?: string,
) {
  const res = await confirmHandler(
    new NextRequest(`http://localhost/api/trust/invite/${inviteId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ pairId, ...device, label }),
      headers: { "Content-Type": "application/json" },
    }),
    inviteParams(inviteId),
  );
  return { res, body: await res.json() };
}

async function circleDevices(pairId: string) {
  const res = await circleHandler(
    new NextRequest(`http://localhost/api/trust/circle?pairId=${pairId}`),
  );
  return (await res.json()).devices;
}

describe("QR pairing invitations", () => {
  beforeEach(() => {
    process.env.PAIR_DERIVATION_KEY = TEST_KEY;
    resetRateLimits();
    trustStore.reset();
  });

  afterEach(() => {
    delete process.env.PAIR_DERIVATION_KEY;
  });

  test("happy path: create → accept (peer enrolled) → confirm (owner enrolled)", async () => {
    const created = await createInvite("Alice");
    assert.equal(created.res.status, 201);
    assert.match(created.body.inviteId, /^[a-f0-9]{32}$/);
    assert.equal(created.body.displayName, "Alice");
    assert.equal(created.body.url, `handshake://pair?invite=${created.body.inviteId}`);
    assert.ok(Date.parse(created.body.expiresAt) > Date.now());
    const inviteId = created.body.inviteId as string;

    // While pending the peer is not yet known and no pair exists.
    const pending = await getInvite(inviteId);
    assert.equal(pending.res.status, 200);
    assert.equal(pending.body.state, "pending");
    assert.equal(pending.body.peerName, null);
    assert.equal(pending.body.pairId, undefined);

    // B accepts: pairId is generated server-side and B is enrolled.
    const accepted = await acceptInvite(inviteId, "Bob", PEER, "Bob phone");
    assert.equal(accepted.res.status, 200);
    assert.equal(accepted.body.state, "accepted");
    assert.equal(accepted.body.peerName, "Bob");
    assert.equal(accepted.body.deviceId, PEER.deviceId);
    const pairId = accepted.body.pairId as string;
    assert.match(pairId, /^[a-f0-9]{32}$/);
    assert.equal(new URL(created.body.url).searchParams.get("invite"), inviteId);

    // The peer device really is enrolled in the new circle.
    let devices = await circleDevices(pairId);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, PEER.deviceId);

    // A confirms with the pairId the server generated.
    const confirmed = await confirmInvite(inviteId, pairId, OWNER, "Alice phone");
    assert.equal(confirmed.res.status, 200);
    assert.equal(confirmed.body.state, "confirmed");
    assert.equal(confirmed.body.pairId, pairId);

    // Owner device is now enrolled too.
    devices = await circleDevices(pairId);
    assert.deepEqual(
      devices.map((d: { deviceId: string }) => d.deviceId).sort(),
      [OWNER.deviceId, PEER.deviceId].sort(),
    );

    // The invite is terminal and readable with both names and the pair.
    const after = await getInvite(inviteId);
    assert.equal(after.res.status, 200);
    assert.equal(after.body.state, "confirmed");
    assert.equal(after.body.displayName, "Alice");
    assert.equal(after.body.peerName, "Bob");
    assert.equal(after.body.pairId, pairId);
  });

  test("an invite cannot be accepted twice (single use)", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;
    const first = await acceptInvite(inviteId, "Bob", PEER);
    assert.equal(first.res.status, 200);

    const second = await acceptInvite(inviteId, "Mallory", {
      deviceId: "c".repeat(32),
      deviceSecret: "3".repeat(64),
    });
    assert.equal(second.res.status, 409);
    assert.equal(second.body.error.code, "inviting_not_pending");

    // The added device never got enrolled by the replayed accept.
    assert.throws(() =>
      trustStore.requireActiveDevice(first.body.pairId as string, "c".repeat(32)),
    );
  });

  test("confirm before accept is rejected (409 inviting_not_pending)", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;

    const res = await confirmInvite(inviteId, "a1b2c3d4e5f60718293a4b5c6d7e8f90", OWNER);
    assert.equal(res.res.status, 409);
    assert.equal(res.body.error.code, "inviting_not_pending");
  });

  test("confirm with a wrong pairId is rejected (409 inviting_pair_mismatch)", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;
    await acceptInvite(inviteId, "Bob", PEER);

    const res = await confirmInvite(inviteId, "ffeeddccbbaa99887766554433221100", OWNER);
    assert.equal(res.res.status, 409);
    assert.equal(res.body.error.code, "inviting_pair_mismatch");

    // The invite is still waiting for the owner to confirm.
    const after = await getInvite(inviteId);
    assert.equal(after.body.state, "accepted");
  });

  test("an invite can never be confirmed twice", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;
    await acceptInvite(inviteId, "Bob", PEER);
    const pairId = (await getInvite(inviteId)).body.pairId as string;

    assert.equal((await confirmInvite(inviteId, pairId, OWNER)).res.status, 200);
    const again = await confirmInvite(inviteId, pairId, OWNER);
    assert.equal(again.res.status, 409);
    assert.equal(again.body.error.code, "inviting_already_confirmed");

    // Re-accept after confirmed is also rejected.
    const reap = await acceptInvite(inviteId, "Mallory", {
      deviceId: "c".repeat(32),
      deviceSecret: "3".repeat(64),
    });
    assert.equal(reap.res.status, 409);
    assert.equal(reap.body.error.code, "inviting_not_pending");
  });

  test("accept and confirm after expiry return 409 inviting_expired", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;

    // Force expiry (120 s TTL) through the store.
    const invites = (
      trustStore as unknown as {
        invites: Map<string, { expiresAt: number }>;
      }
    ).invites;
    invites.get(inviteId)!.expiresAt = Date.now() - 1;

    const accept = await acceptInvite(inviteId, "Bob", PEER);
    assert.equal(accept.res.status, 409);
    assert.equal(accept.body.error.code, "inviting_expired");

    const confirm = await confirmInvite(inviteId, "a1b2c3d4e5f60718293a4b5c6d7e8f90", OWNER);
    assert.equal(confirm.res.status, 409);
    assert.equal(confirm.body.error.code, "inviting_expired");

    const read = await getInvite(inviteId);
    assert.equal(read.res.status, 409);
    assert.equal(read.body.error.code, "inviting_expired");

    // The QR is unusable once expired too.
    const qr = await qrHandler(
      new NextRequest(`http://localhost/api/trust/invite/${inviteId}/qr`),
      inviteParams(inviteId),
    );
    assert.equal(qr.status, 409);
    assert.equal((await qr.json()).error.code, "inviting_expired");
  });

  test("unknown invite id returns 404 inviting_not_found", async () => {
    const res = await getInvite("0".repeat(32));
    assert.equal(res.res.status, 404);
    assert.equal(res.body.error.code, "inviting_not_found");
  });

  test("sweep removes expired invites", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;
    const invites = (
      trustStore as unknown as {
        invites: Map<string, { expiresAt: number }>;
      }
    ).invites;
    invites.get(inviteId)!.expiresAt = Date.now() - 1;

    trustStore.sweep();
    assert.equal(invites.has(inviteId), false);

    const read = await getInvite(inviteId);
    assert.equal(read.res.status, 404);
  });

  test("QR endpoint serves a PNG containing only the invite deep link", async () => {
    const created = await createInvite("Alice");
    const inviteId = created.body.inviteId as string;
    assert.match(created.body.url, /^handshake:\/\/pair\?invite=[a-f0-9]{32}$/);

    const qr = await qrHandler(
      new NextRequest(`http://localhost/api/trust/invite/${inviteId}/qr`),
      inviteParams(inviteId),
    );
    assert.equal(qr.status, 200);
    assert.equal(qr.headers.get("Content-Type"), "image/png");
    assert.match(qr.headers.get("Cache-Control") ?? "", /no-store/);
    const buf = Buffer.from(await qr.arrayBuffer());
    assert.ok(buf.length > 0);
    // PNG magic bytes confirm the payload is a real PNG, not a JSON object.
    assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    // Once accepted the QR is no longer usable.
    await acceptInvite(inviteId, "Bob", PEER);
    const reused = await qrHandler(
      new NextRequest(`http://localhost/api/trust/invite/${inviteId}/qr`),
      inviteParams(inviteId),
    );
    assert.equal(reused.status, 409);
    assert.equal((await reused.json()).error.code, "inviting_not_pending");
  });

  describe("parsePairInvite URL helper", () => {
    test("parses valid handshake scheme deep link", () => {
      assert.equal(
        parsePairInvite("handshake://pair?invite=1234567890abcdef1234567890abcdef"),
        "1234567890abcdef1234567890abcdef",
      );
    });

    test("parses web URL deep link", () => {
      assert.equal(
        parsePairInvite("https://handshake.app/pair?invite=abcdef1234567890abcdef1234567890"),
        "abcdef1234567890abcdef1234567890",
      );
    });

    test("parses URL with extra query params", () => {
      assert.equal(
        parsePairInvite("handshake://pair?foo=bar&invite=abc123def456&baz=qux"),
        "abc123def456",
      );
    });

    test("parses unparseable / fallback URL formats", () => {
      assert.equal(parsePairInvite("/pair?invite=fallback123"), "fallback123");
    });

    test("returns null for missing, empty, or invalid input", () => {
      assert.equal(parsePairInvite(null), null);
      assert.equal(parsePairInvite(undefined), null);
      assert.equal(parsePairInvite(""), null);
      assert.equal(parsePairInvite("   "), null);
      assert.equal(parsePairInvite("handshake://other?invite=123"), null);
      assert.equal(parsePairInvite("https://handshake.app/pair"), null);
      assert.equal(parsePairInvite("https://handshake.app/pair?invite="), null);
    });
  });
});
