import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { trustStore } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const PAIR_1 = "pair1111111111111111111111111111" as PairId;
const DEV_1 = "dev11111111111111111111111111111" as DeviceId;
const DEV_2 = "dev22222222222222222222222222222" as DeviceId;

describe("trustStore persistence", () => {
  let tempFilePath: string;

  beforeEach(() => {
    trustStore.reset();
    tempFilePath = join(
      tmpdir(),
      `test-trust-store-${Math.random().toString(36).substring(2)}.json`,
    );
  });

  afterEach(() => {
    trustStore.reset();
    if (existsSync(tempFilePath)) {
      try {
        unlinkSync(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
    delete process.env.TRUST_STORE_PATH;
  });

  test("exportState and importState preserve devices, invites, and sessions", () => {
    // 1. Setup initial state
    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_1,
      deviceSecret: "secret1".repeat(8),
      label: "Device One",
    });

    const invite = trustStore.createInvite({ ownerDisplayName: "Alice" });

    // 2. Export state
    const exported = trustStore.exportState();
    assert.equal(exported.pairs.length, 1);
    assert.equal(exported.pairs[0][0], PAIR_1);
    assert.equal(exported.pairs[0][1].length, 1);
    assert.equal(exported.pairs[0][1][0].deviceId, DEV_1);
    assert.equal(exported.invites.length, 1);
    assert.equal(exported.invites[0].inviteId, invite.inviteId);

    // 3. Reset and verify store is empty
    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);
    assert.equal(trustStore.getInvite(invite.inviteId), null);

    // 4. Import state
    trustStore.importState(exported);

    // 5. Verify state is restored
    const devices = trustStore.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_1);
    assert.equal(devices[0].label, "Device One");

    const restoredInvite = trustStore.getInvite(invite.inviteId);
    assert.notEqual(restoredInvite, null);
    assert.equal(restoredInvite?.ownerDisplayName, "Alice");
  });

  test("saveToFile and loadFromFile persist state atomically via file", () => {
    // Enroll two devices
    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_1,
      deviceSecret: "secret1".repeat(8),
      label: "Device 1",
    });
    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_2,
      deviceSecret: "secret2".repeat(8),
      label: "Device 2",
    });

    // Save to file
    trustStore.saveToFile(tempFilePath);
    assert.equal(existsSync(tempFilePath), true);

    // Reset in-memory state
    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    // Load from file
    const loaded = trustStore.loadFromFile(tempFilePath);
    assert.equal(loaded, true);

    // Verify restored devices
    const devices = trustStore.listDevices(PAIR_1);
    assert.equal(devices.length, 2);
    assert.equal(devices[0].deviceId, DEV_1);
    assert.equal(devices[1].deviceId, DEV_2);
  });

  test("saveToFile and loadFromFile use TRUST_STORE_PATH env var", () => {
    process.env.TRUST_STORE_PATH = tempFilePath;

    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_1,
      deviceSecret: "secret1".repeat(8),
      label: "Env Device",
    });

    trustStore.saveToFile();
    assert.equal(existsSync(tempFilePath), true);

    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    const loaded = trustStore.loadFromFile();
    assert.equal(loaded, true);

    const devices = trustStore.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].label, "Env Device");
  });
});
