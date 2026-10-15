import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, describe, beforeEach, afterEach } from "node:test";
import { TrustStore } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const TEST_PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90" as PairId;
const TEST_DEVICE_ID = "a".repeat(32) as DeviceId;
const TEST_SECRET = "1".repeat(64);

describe("TrustStore State Persistence & Export/Import", () => {
  let tempDir: string;
  let persistenceFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trust-store-test-"));
    persistenceFile = path.join(tempDir, "trust_store.json");
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  test("exportState and importState preserve pairs, sessions, and invites", () => {
    const store = new TrustStore(null);

    store.enroll({
      pairId: TEST_PAIR_ID,
      deviceId: TEST_DEVICE_ID,
      deviceSecret: TEST_SECRET,
      label: "Phone A",
    });

    const invite = store.createInvite({ ownerDisplayName: "Alice" });

    const exported = store.exportState();
    assert.equal(exported.pairs.length, 1);
    assert.equal(exported.pairs[0][0], TEST_PAIR_ID);
    assert.equal(exported.pairs[0][1][0].deviceId, TEST_DEVICE_ID);
    assert.equal(exported.invites.length, 1);
    assert.equal(exported.invites[0].inviteId, invite.inviteId);

    const newStore = new TrustStore(null);
    newStore.importState(exported);

    const devices = newStore.listDevices(TEST_PAIR_ID);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, TEST_DEVICE_ID);
    assert.equal(devices[0].label, "Phone A");

    const fetchedInvite = newStore.getInvite(invite.inviteId);
    assert.ok(fetchedInvite);
    assert.equal(fetchedInvite.ownerDisplayName, "Alice");
  });

  test("atomic file persistence saves state automatically on mutation", () => {
    const store = new TrustStore(persistenceFile);

    store.enroll({
      pairId: TEST_PAIR_ID,
      deviceId: TEST_DEVICE_ID,
      deviceSecret: TEST_SECRET,
      label: "Persistent Device",
    });

    assert.ok(fs.existsSync(persistenceFile), "Persistence file should be created on mutation");
    const content = fs.readFileSync(persistenceFile, "utf8");
    assert.match(content, new RegExp(TEST_DEVICE_ID));

    // Instantiating a new store pointing to the same file should load persisted state
    const restoredStore = new TrustStore(persistenceFile);
    const devices = restoredStore.listDevices(TEST_PAIR_ID);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].label, "Persistent Device");
  });

  test("corrupted file on disk fails gracefully without throwing error", () => {
    fs.writeFileSync(persistenceFile, "invalid json { content", "utf8");

    // Should not throw on initialization
    const store = new TrustStore(persistenceFile);
    assert.equal(store.listDevices(TEST_PAIR_ID).length, 0);

    // Should overwrite corrupted file safely on new enrollment
    store.enroll({
      pairId: TEST_PAIR_ID,
      deviceId: TEST_DEVICE_ID,
      deviceSecret: TEST_SECRET,
    });

    assert.equal(store.listDevices(TEST_PAIR_ID).length, 1);
    const content = fs.readFileSync(persistenceFile, "utf8");
    assert.doesNotThrow(() => JSON.parse(content));
  });

  test("environment variable TRUST_STORE_PATH is respected when constructor path is not provided", () => {
    const previousEnv = process.env.TRUST_STORE_PATH;
    process.env.TRUST_STORE_PATH = persistenceFile;

    try {
      const store = new TrustStore();
      store.enroll({
        pairId: TEST_PAIR_ID,
        deviceId: TEST_DEVICE_ID,
        deviceSecret: TEST_SECRET,
        label: "Env Configured",
      });

      assert.ok(fs.existsSync(persistenceFile));
      const reloadedStore = new TrustStore(persistenceFile);
      assert.equal(reloadedStore.listDevices(TEST_PAIR_ID)[0].label, "Env Configured");
    } finally {
      if (previousEnv === undefined) {
        delete process.env.TRUST_STORE_PATH;
      } else {
        process.env.TRUST_STORE_PATH = previousEnv;
      }
    }
  });
});
