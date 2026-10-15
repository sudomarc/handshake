/**
 * Trust store persistence and restart recovery tests.
 */

import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TrustStore } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const TEST_FILE = join(tmpdir(), `handshake_trust_test_${Date.now()}.json`);
const PAIR_A = "11111111111111111111111111111111" as PairId;
const DEVICE_1 = "a".repeat(32) as DeviceId;
const DEVICE_2 = "b".repeat(32) as DeviceId;
const SECRET_1 = "1".repeat(64);
const SECRET_2 = "2".repeat(64);

describe("TrustStore persistence and restart recovery", () => {
  let store: TrustStore;

  beforeEach(() => {
    if (existsSync(TEST_FILE)) {
      try {
        unlinkSync(TEST_FILE);
      } catch {
        // ignore
      }
    }
    store = new TrustStore(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_FILE)) {
      try {
        unlinkSync(TEST_FILE);
      } catch {
        // ignore
      }
    }
  });

  test("exports and imports store state correctly", () => {
    store.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Phone 1",
    });

    const invite = store.createInvite({ ownerDisplayName: "Alice" });

    const state = store.exportState();
    assert.equal(state.pairs.length, 1);
    assert.equal(state.invites.length, 1);
    assert.equal(state.invites[0][0], invite.inviteId);

    const newStore = new TrustStore();
    newStore.importState(state);

    const devices = newStore.listDevices(PAIR_A);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEVICE_1);
    assert.equal(devices[0].label, "Phone 1");

    const importedInvite = newStore.getInvite(invite.inviteId);
    assert.ok(importedInvite);
    assert.equal(importedInvite.ownerDisplayName, "Alice");
  });

  test("persists state to disk and reloads on new store instance", () => {
    store.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Device Alpha",
    });

    store.enroll({
      pairId: PAIR_A,
      deviceId: DEVICE_2,
      deviceSecret: SECRET_2,
      label: "Device Beta",
    });

    assert.ok(existsSync(TEST_FILE));

    // Simulate server process restart by creating a new TrustStore with the same file path.
    const restartedStore = new TrustStore(TEST_FILE);
    const devices = restartedStore.listDevices(PAIR_A);
    assert.equal(devices.length, 2);
    assert.equal(devices[0].deviceId, DEVICE_1);
    assert.equal(devices[1].deviceId, DEVICE_2);
  });

  test("recovers invitations across server restart", () => {
    const invite = store.createInvite({ ownerDisplayName: "Alice" });
    const inviteId = invite.inviteId;

    // Process A accepts invite
    store.acceptInvite({
      inviteId,
      peerDisplayName: "Bob",
      deviceId: DEVICE_2,
      deviceSecret: SECRET_2,
      label: "Bob Phone",
    });

    // Simulate server restart (Process B loads from disk)
    const storeB = new TrustStore(TEST_FILE);
    const reloadedInvite = storeB.getInvite(inviteId);
    assert.ok(reloadedInvite);
    assert.equal(reloadedInvite.state, "accepted");
    assert.equal(reloadedInvite.peerDisplayName, "Bob");

    // Process B confirms invite
    const pairId = reloadedInvite.pairId as PairId;
    storeB.confirmInvite({
      inviteId,
      pairId,
      deviceId: DEVICE_1,
      deviceSecret: SECRET_1,
      label: "Alice Phone",
    });

    assert.equal(storeB.getInvite(inviteId)?.state, "confirmed");
    assert.equal(storeB.listDevices(pairId).length, 2);
  });

  test("handles missing or corrupted persistence files gracefully", () => {
    const nonExistent = join(tmpdir(), "non_existent_trust_store.json");
    const emptyStore = new TrustStore(nonExistent);
    assert.equal(emptyStore.listDevices(PAIR_A).length, 0);

    const corruptFile = join(tmpdir(), `corrupt_trust_${Date.now()}.json`);
    writeFileSync(corruptFile, "{ invalid json ...", "utf-8");

    const corruptStore = new TrustStore(corruptFile);
    assert.equal(corruptStore.listDevices(PAIR_A).length, 0);

    if (existsSync(corruptFile)) unlinkSync(corruptFile);
  });
});
