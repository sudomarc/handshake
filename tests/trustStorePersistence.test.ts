import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { trustStore } from "../lib/trustStore";
import type { PairId, DeviceId } from "../lib/trustSchemas";

const PAIR_1 = "11112222333344445555666677778888" as PairId;
const DEV_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as DeviceId;

describe("TrustStore state export/import and atomic file persistence", () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = path.join(
      os.tmpdir(),
      `truststore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    filePath = path.join(tmpDir, "truststore.json");
    trustStore.reset();
  });

  afterEach(() => {
    delete process.env.TRUST_STORE_PATH;
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("exportState and importState preserve full store snapshot", () => {
    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "sec1",
      label: "Phone A",
    });

    const invite = trustStore.createInvite({ ownerDisplayName: "Alice" });

    const snapshot = trustStore.exportState();
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.pairs.length, 1);
    assert.equal(snapshot.invites.length, 1);

    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    trustStore.importState(snapshot);
    const devices = trustStore.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, DEV_A);
    assert.equal(devices[0].label, "Phone A");
    assert.equal(trustStore.getInvite(invite.inviteId)?.ownerDisplayName, "Alice");
  });

  test("saveToFile and loadFromFile persist and restore state from file", () => {
    process.env.TRUST_STORE_PATH = filePath;

    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: DEV_A,
      deviceSecret: "sec1",
      label: "Phone A",
    });

    assert.equal(existsSync(filePath), true);

    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    const loaded = trustStore.loadFromFile();
    assert.equal(loaded, true);
    assert.equal(trustStore.listDevices(PAIR_1).length, 1);
  });

  test("handles missing or corrupted persistence files gracefully", () => {
    const missingPath = path.join(tmpDir, "nonexistent.json");
    assert.equal(trustStore.loadFromFile(missingPath), false);

    const corruptPath = path.join(tmpDir, "corrupt.json");
    writeFileSync(corruptPath, "{ invalid json ...", "utf-8");
    assert.equal(trustStore.loadFromFile(corruptPath), false);
  });
});
