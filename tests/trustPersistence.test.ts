import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, describe, beforeEach, afterEach } from "node:test";
import { computeDeviceProof, TRUST_PROTOCOL } from "../lib/trustCrypto";
import { TrustStore } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const PAIR_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90" as PairId;
const DEVICE_1 = "11111111111111111111111111111111" as DeviceId;
const DEVICE_2 = "22222222222222222222222222222222" as DeviceId;
const SECRET_1 = "1".repeat(64);
const SECRET_2 = "2".repeat(64);

function getTmpPath(name: string): string {
  return join(
    tmpdir(),
    `handshake_test_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
  );
}

describe("TrustStore persistence and export/import", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = getTmpPath("trust_store");
    delete process.env.TRUST_STORE_PATH;
  });

  afterEach(() => {
    delete process.env.TRUST_STORE_PATH;
    if (existsSync(tmpFile)) {
      rmSync(tmpFile, { force: true });
    }
  });

  test("exportState and importState preserve devices, invites, sessions, and usedNonces", async () => {
    const store = new TrustStore();

    // 1. Enroll device
    store.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Phone A",
    });

    // 2. Create invite
    const invite = store.createInvite({ ownerDisplayName: "Alice" });

    // 3. Open session
    const nonce1 = "n1".repeat(16);
    const issuedAt = Date.now();
    const proof1 = await computeDeviceProof({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      sessionId: TRUST_PROTOCOL,
      nonce: nonce1,
      issuedAt,
      deviceSecret: SECRET_1,
    });

    const session = store.openSession({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      nonce: nonce1,
      issuedAt,
      proof: proof1,
    });

    // Export state
    const exported = store.exportState();
    assert.equal(exported.pairs.length, 1);
    assert.equal(exported.invites.length, 1);
    assert.equal(exported.sessions.length, 1);
    assert.deepEqual(exported.sessions[0][1].usedNonces, [nonce1]);

    // Import into a fresh store
    const newStore = new TrustStore();
    newStore.importState(exported);

    // Verify imported state
    const devices = newStore.listDevices(PAIR_A);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].label, "Phone A");

    const fetchedInvite = newStore.getInvite(invite.inviteId);
    assert.ok(fetchedInvite);
    assert.equal(fetchedInvite?.ownerDisplayName, "Alice");

    // Re-joining with new nonce works on session
    newStore.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_2,
      deviceSecret: SECRET_2,
      label: "Phone B",
    });

    const nonce2 = "n2".repeat(16);
    const joinProof = await computeDeviceProof({
      pairId: PAIR_A,
      deviceId: DEVICE_2,
      sessionId: session.sessionId,
      nonce: nonce2,
      issuedAt,
      deviceSecret: SECRET_2,
    });

    const joinedSession = newStore.joinSession({
      sessionId: session.sessionId,
      deviceId: DEVICE_2,
      nonce: nonce2,
      issuedAt,
      proof: joinProof,
    });
    assert.equal(joinedSession.state, "trusted");

    // Replaying the join nonce on the imported session is rejected
    assert.throws(
      () =>
        newStore.joinSession({
          sessionId: session.sessionId,
          deviceId: DEVICE_2,
          nonce: nonce2, // replayed nonce
          issuedAt,
          proof: joinProof,
        }),
      { name: "TrustError", code: "nonce_replayed" },
    );
  });

  test("file-backed persistence with filePath constructor option automatically persists and loads", async () => {
    const store1 = new TrustStore({ filePath: tmpFile });

    store1.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Phone 1",
    });

    assert.ok(existsSync(tmpFile));
    const fileContent = JSON.parse(readFileSync(tmpFile, "utf8"));
    assert.equal(fileContent.pairs.length, 1);

    // Instantiate new store using same filePath
    const store2 = new TrustStore({ filePath: tmpFile });
    const devices = store2.listDevices(PAIR_A);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEVICE_1);
    assert.equal(devices[0].label, "Phone 1");
  });

  test("file-backed persistence with TRUST_STORE_PATH env var", async () => {
    process.env.TRUST_STORE_PATH = tmpFile;

    const store1 = new TrustStore();
    store1.createInvite({ ownerDisplayName: "Bob" });

    assert.ok(existsSync(tmpFile));

    const store2 = new TrustStore();
    const exported = store2.exportState();
    assert.equal(exported.invites.length, 1);
    assert.equal(exported.invites[0][1].ownerDisplayName, "Bob");
  });

  test("file-backed persistence automatically creates missing nested parent directories", () => {
    const nestedFile = join(tmpdir(), `nested_dir_${Date.now()}`, "sub", "trust.json");
    try {
      const store = new TrustStore({ filePath: nestedFile });
      store.enroll({
        pairId: PAIR_A,
        deviceId: DEVICE_1,
        deviceSecret: SECRET_1,
      });
      assert.ok(existsSync(nestedFile));
    } finally {
      if (existsSync(nestedFile)) {
        rmSync(join(tmpdir(), `nested_dir_${Date.now()}`), { recursive: true, force: true });
      }
    }
  });

  test("reset clears in-memory maps and removes persisted file", () => {
    const store = new TrustStore({ filePath: tmpFile });
    store.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
    });
    assert.ok(existsSync(tmpFile));

    store.reset();
    assert.equal(store.listDevices(PAIR_A).length, 0);
    assert.equal(existsSync(tmpFile), false);
  });
});
