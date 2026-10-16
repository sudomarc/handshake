import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, describe, beforeEach, afterEach } from "node:test";
import { TrustStore, type StoredDevice } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const PAIR_1 = "11111111111111111111111111111111" as PairId;
const DEVICE_1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as DeviceId;
const SECRET_1 = "1111111111111111111111111111111111111111111111111111111111111111";

describe("TrustStore state export/import and persistence", () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trust-store-test-"));
    filePath = path.join(tmpDir, "sub", "trust_store.json");
  });

  afterEach(() => {
    delete process.env.TRUST_STORE_PATH;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("exportState and importState preserve complete trust store state", () => {
    const storeA = new TrustStore();
    storeA.enroll({
      pairId: PAIR_1,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Phone A",
    });

    const invite = storeA.createInvite({ ownerDisplayName: "Alice" });

    const snapshot = storeA.exportState();
    assert.equal(snapshot.pairs.length, 1);
    assert.equal(snapshot.invites.length, 1);
    assert.equal(snapshot.invites[0].inviteId, invite.inviteId);

    const storeB = new TrustStore();
    storeB.importState(snapshot);

    const devices = storeB.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEVICE_1);
    assert.equal(devices[0].label, "Phone A");

    const fetchedInvite = storeB.getInvite(invite.inviteId);
    assert.ok(fetchedInvite);
    assert.equal(fetchedInvite?.ownerDisplayName, "Alice");
  });

  test("file-backed persistence automatically saves and loads state across instances", () => {
    const storeA = new TrustStore({ filePath });
    storeA.enroll({
      pairId: PAIR_1,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Phone A",
    });

    assert.ok(fs.existsSync(filePath), "Persistence file should be created on disk");

    // Process restart simulation
    const storeB = new TrustStore({ filePath });
    const devices = storeB.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEVICE_1);
    assert.equal(devices[0].label, "Phone A");
  });

  test("TRUST_STORE_PATH environment variable enables file persistence automatically", () => {
    process.env.TRUST_STORE_PATH = filePath;

    const storeA = new TrustStore();
    storeA.enroll({
      pairId: PAIR_1,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Env Phone",
    });

    assert.ok(fs.existsSync(filePath), "Persistence file should be created via TRUST_STORE_PATH");

    const storeB = new TrustStore();
    const devices = storeB.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].label, "Env Phone");
  });

  test("handles missing or invalid persistence file gracefully", () => {
    // Write invalid JSON to file
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "{ invalid json ...", "utf8");

    // Instantiating TrustStore should not crash
    const store = new TrustStore({ filePath });
    assert.equal(store.listDevices(PAIR_1).length, 0);
  });
});
