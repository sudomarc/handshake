import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TrustStore } from "../lib/trustStore";
import { computeDeviceProof, TRUST_PROTOCOL } from "../lib/trustCrypto";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const TEST_PAIR_1 = "1".repeat(32) as PairId;
const DEV_A = "a".repeat(32) as DeviceId;

describe("TrustStore state export, import, and file persistence", () => {
  let tmpFilePath: string;

  beforeEach(() => {
    tmpFilePath = join(
      tmpdir(),
      `trust-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
    );
    delete process.env.TRUST_STORE_PATH;
  });

  afterEach(() => {
    delete process.env.TRUST_STORE_PATH;
    if (existsSync(tmpFilePath)) {
      try {
        unlinkSync(tmpFilePath);
      } catch {}
    }
  });

  test("exportState and importState round-trip successfully", () => {
    const store1 = new TrustStore();
    store1.enroll({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "1".repeat(64),
      label: "Phone A",
    });

    const invite = store1.createInvite({ ownerDisplayName: "Alice" });
    const state = store1.exportState();

    assert.equal(state.version, 1);
    assert.equal(state.pairs.length, 1);
    assert.equal(state.invites.length, 1);
    assert.equal(state.invites[0][0], invite.inviteId);

    const store2 = new TrustStore();
    store2.importState(state);

    const devices = store2.listDevices(TEST_PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_A);
    assert.equal(devices[0].label, "Phone A");

    const fetchedInvite = store2.getInvite(invite.inviteId);
    assert.ok(fetchedInvite);
    assert.equal(fetchedInvite?.ownerDisplayName, "Alice");
  });

  test("automatic persistence when TRUST_STORE_PATH is set in environment", () => {
    process.env.TRUST_STORE_PATH = tmpFilePath;

    const store1 = new TrustStore();
    store1.enroll({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "1".repeat(64),
      label: "Persisted Device",
    });

    assert.equal(existsSync(tmpFilePath), true);
    const rawContent = readFileSync(tmpFilePath, "utf-8");
    assert.match(rawContent, /Persisted Device/);

    // Re-instantiate a new store; it should load from TRUST_STORE_PATH on constructor
    const store2 = new TrustStore();
    const devices = store2.listDevices(TEST_PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_A);
    assert.equal(devices[0].label, "Persisted Device");
  });

  test("setStoragePath updates path and loads existing state", () => {
    const store1 = new TrustStore(tmpFilePath);
    store1.enroll({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "1".repeat(64),
      label: "Explicit Path",
    });

    const store2 = new TrustStore();
    assert.equal(store2.listDevices(TEST_PAIR_1).length, 0);

    store2.setStoragePath(tmpFilePath);
    assert.equal(store2.listDevices(TEST_PAIR_1).length, 1);
    assert.equal(store2.listDevices(TEST_PAIR_1)[0].label, "Explicit Path");
  });

  test("usedNonces Set is preserved across import/export and persistence", async () => {
    process.env.TRUST_STORE_PATH = tmpFilePath;
    const store1 = new TrustStore();
    const secret = "1".repeat(64);
    store1.enroll({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      deviceSecret: secret,
    });

    const nonceStr = "a".repeat(32);
    const issuedAt = Date.now();
    const validProof = await computeDeviceProof({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      sessionId: TRUST_PROTOCOL,
      nonce: nonceStr,
      issuedAt,
      deviceSecret: secret,
    });

    const session = store1.openSession({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      nonce: nonceStr,
      issuedAt,
      proof: validProof,
    });

    // Re-instantiate store from disk
    const store2 = new TrustStore();
    const loadedState = store2.exportState();
    const loadedSession = loadedState.sessions.find(([id]) => id === session.sessionId);
    assert.ok(loadedSession);
    assert.deepEqual(loadedSession[1].usedNonces, [nonceStr]);
  });

  test("loadFromFile handles unreadable or corrupted JSON gracefully", () => {
    const store = new TrustStore();
    assert.equal(store.loadFromFile("/nonexistent/file/path.json"), false);

    const store2 = new TrustStore(tmpFilePath);
    writeFileSync(tmpFilePath, "{ invalid json ...", "utf-8");

    assert.equal(store2.loadFromFile(tmpFilePath), false);
  });

  test("reset unlinks storage file", () => {
    const store = new TrustStore(tmpFilePath);
    store.enroll({
      pairId: TEST_PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "1".repeat(64),
    });

    assert.equal(existsSync(tmpFilePath), true);
    store.reset();
    assert.equal(existsSync(tmpFilePath), false);
  });
});
