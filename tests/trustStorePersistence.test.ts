/**
 * Unit tests for TrustStore state export/import and atomic file-backed persistence.
 */

import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TrustStore } from "../lib/trustStore";
import type { PairId, DeviceId } from "../lib/trustSchemas";

const PAIR_1 = "11111111111111111111111111111111" as PairId;
const PAIR_2 = "22222222222222222222222222222222" as PairId;
const DEV_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as DeviceId;
const DEV_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as DeviceId;

describe("TrustStore state export/import and file persistence", () => {
  let testFilePath: string;

  beforeEach(() => {
    testFilePath = join(
      tmpdir(),
      `handshake-trust-test-${Date.now()}-${Math.random().toString(36).substring(2)}.json`,
    );
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      try {
        unlinkSync(testFilePath);
      } catch {
        // ignore
      }
    }
    delete process.env.TRUST_STORE_PATH;
  });

  test("exportState and importState preserve devices, invites, and sessions with nonces", () => {
    const store1 = new TrustStore();
    store1.enroll({
      pairId: PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "secretA",
      label: "Phone A",
    });

    const invite = store1.createInvite({ ownerDisplayName: "Alice" });
    const snapshot = store1.exportState();

    assert.equal(snapshot.pairs.length, 1);
    assert.equal(snapshot.pairs[0].pairId, PAIR_1);
    assert.equal(snapshot.pairs[0].devices.length, 1);
    assert.equal(snapshot.pairs[0].devices[0].deviceId, DEV_A);

    assert.equal(snapshot.invites.length, 1);
    assert.equal(snapshot.invites[0].inviteId, invite.inviteId);

    const store2 = new TrustStore();
    store2.importState(snapshot);

    const snapshot2 = store2.exportState();
    assert.deepEqual(snapshot, snapshot2);

    const devices = store2.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_A);
    assert.equal(devices[0].label, "Phone A");
  });

  test("persists state to disk atomically when filePath is provided", () => {
    const store1 = new TrustStore(testFilePath);
    store1.enroll({
      pairId: PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "secretA",
      label: "Phone A",
    });

    assert.equal(existsSync(testFilePath), true);

    const store2 = new TrustStore(testFilePath);
    const devices = store2.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_A);
    assert.equal(devices[0].label, "Phone A");
  });

  test("uses TRUST_STORE_PATH env var if constructor arg is omitted", () => {
    process.env.TRUST_STORE_PATH = testFilePath;
    const store1 = new TrustStore();
    store1.enroll({
      pairId: PAIR_2,
      deviceId: DEV_B,
      deviceSecret: "secretB",
      label: "Phone B",
    });

    assert.equal(existsSync(testFilePath), true);

    const store2 = new TrustStore();
    const devices = store2.listDevices(PAIR_2);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_B);
  });

  test("handles corrupted file gracefully on load without throwing", () => {
    writeFileSync(testFilePath, "{ corrupted invalid json ...", "utf8");
    const store = new TrustStore(testFilePath);
    const snapshot = store.exportState();
    assert.equal(snapshot.pairs.length, 0);
    assert.equal(snapshot.sessions.length, 0);
    assert.equal(snapshot.invites.length, 0);
  });
});
