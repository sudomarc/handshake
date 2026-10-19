import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { trustStore, TrustStore } from "../lib/trustStore";
import { computeDeviceProof, TRUST_PROTOCOL, type PairId, type DeviceId } from "../lib/trustCrypto";

describe("TrustStore Persistence & State Import/Export", () => {
  test("exportState and importState preserve pairs, sessions, and invites", () => {
    trustStore.reset();

    const pairId = "11111111111111111111111111111111" as PairId;
    const dev1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as DeviceId;
    const dev2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as DeviceId;
    const secret1 = "1111111111111111111111111111111111111111111111111111111111111111";
    const secret2 = "2222222222222222222222222222222222222222222222222222222222222222";

    // Enroll device 1
    trustStore.enroll({
      pairId,
      deviceId: dev1,
      deviceSecret: secret1,
      label: "Device One",
    });

    // Create an invite
    const invite = trustStore.createInvite({ ownerDisplayName: "Alice" });

    // Open a session
    const nonce1 = "33333333333333333333333333333333";
    const issuedAt = Date.now();
    const proof1 = computeDeviceProof({
      pairId,
      deviceId: dev1,
      sessionId: TRUST_PROTOCOL,
      nonce: nonce1,
      issuedAt,
      deviceSecret: secret1,
    });

    const session = trustStore.openSession({
      pairId,
      deviceId: dev1,
      nonce: nonce1,
      issuedAt,
      proof: proof1,
    });

    // Export state
    const exported = trustStore.exportState();
    assert.equal(exported.version, 1);
    assert.equal(exported.pairs.length, 1);
    assert.equal(exported.invites.length, 1);
    assert.equal(exported.sessions.length, 1);

    // Reset store and import
    trustStore.reset();
    assert.equal(trustStore.listDevices(pairId).length, 0);

    trustStore.importState(exported);

    // Verify restored state
    const devices = trustStore.listDevices(pairId);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, dev1);
    assert.equal(devices[0].label, "Device One");

    const restoredInvite = trustStore.getInvite(invite.inviteId);
    assert.notEqual(restoredInvite, null);
    assert.equal(restoredInvite?.ownerDisplayName, "Alice");

    // Join restored session with dev2 after enrolling dev2
    trustStore.enroll({
      pairId,
      deviceId: dev2,
      deviceSecret: secret2,
      label: "Device Two",
    });

    const nonce2 = "44444444444444444444444444444444";
    const proof2 = computeDeviceProof({
      pairId,
      deviceId: dev2,
      sessionId: session.sessionId,
      nonce: nonce2,
      issuedAt,
      deviceSecret: secret2,
    });

    const joinedSession = trustStore.joinSession({
      sessionId: session.sessionId,
      deviceId: dev2,
      nonce: nonce2,
      issuedAt,
      proof: proof2,
    });

    assert.equal(joinedSession.state, "trusted");
    assert.equal(joinedSession.peerDeviceId, dev2);

    trustStore.reset();
  });

  test("file-backed persistence restores state across store instances", () => {
    const filePath = join(
      tmpdir(),
      `trust-store-test-${Date.now()}-${Math.random().toString(36).substring(2)}.json`,
    );

    try {
      const storeA = new TrustStore({ persistenceFilePath: filePath });

      const pairId = "55555555555555555555555555555555" as PairId;
      const dev1 = "cccccccccccccccccccccccccccccccc" as DeviceId;
      const secret1 = "5555555555555555555555555555555555555555555555555555555555555555";

      storeA.enroll({
        pairId,
        deviceId: dev1,
        deviceSecret: secret1,
        label: "Persistent Device",
      });

      assert.equal(existsSync(filePath), true);

      // Create new instance reading same file
      const storeB = new TrustStore({ persistenceFilePath: filePath });
      const devices = storeB.listDevices(pairId);

      assert.equal(devices.length, 1);
      assert.equal(devices[0].deviceId, dev1);
      assert.equal(devices[0].label, "Persistent Device");
    } finally {
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });
});
