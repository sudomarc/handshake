import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { trustStore, TrustError } from "../lib/trustStore";
import type { PairId, DeviceId } from "../lib/trustCrypto";

test("TrustStore persistence and state serialization", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "truststore-test-"));
  const filePath = path.join(tmpDir, "trust-store.json");

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    trustStore.setPersistencePath(null);
    trustStore.reset();
  });

  await t.test("exportState and importState preserve devices, sessions, and invites", () => {
    trustStore.reset();
    const pairId = "pair_test_1" as PairId;
    const deviceId = "dev_test_1" as DeviceId;

    trustStore.enroll({
      pairId,
      deviceId,
      deviceSecret: "sec_test_1",
      label: "Test Phone",
    });

    const invite = trustStore.createInvite({ ownerDisplayName: "Alice" });

    const snapshot = trustStore.exportState();
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.pairs.length, 1);
    assert.equal(snapshot.pairs[0].pairId, pairId);
    assert.equal(snapshot.pairs[0].devices.length, 1);
    assert.equal(snapshot.pairs[0].devices[0].label, "Test Phone");
    assert.equal(snapshot.invites.length, 1);
    assert.equal(snapshot.invites[0].inviteId, invite.inviteId);

    // Reset and import back
    trustStore.reset();
    assert.equal(trustStore.listDevices(pairId).length, 0);

    trustStore.importState(snapshot);
    const devices = trustStore.listDevices(pairId);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, deviceId);
    assert.equal(devices[0].label, "Test Phone");
    assert.ok(trustStore.getInvite(invite.inviteId));
  });

  await t.test("saveToFile and loadFromFile persist to disk atomically", () => {
    trustStore.reset();
    trustStore.setPersistencePath(filePath);

    const pairId = "pair_disk_1" as PairId;
    const deviceId = "dev_disk_1" as DeviceId;

    trustStore.enroll({
      pairId,
      deviceId,
      deviceSecret: "sec_disk_1",
      label: "Disk Device",
    });

    // File should exist and be valid JSON
    assert.ok(fs.existsSync(filePath));
    const content = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(content);
    assert.equal(json.version, 1);

    // Reset memory and load from file
    trustStore.reset();
    assert.equal(trustStore.listDevices(pairId).length, 0);

    const loaded = trustStore.loadFromFile(filePath);
    assert.equal(loaded, true);
    assert.equal(trustStore.listDevices(pairId).length, 1);
    assert.equal(trustStore.listDevices(pairId)[0].label, "Disk Device");
  });

  await t.test("loadFromFile returns false on non-existent or corrupt file", () => {
    const corruptPath = path.join(tmpDir, "corrupt.json");
    fs.writeFileSync(corruptPath, "not json content", "utf8");

    const nonExistentPath = path.join(tmpDir, "missing.json");

    assert.equal(trustStore.loadFromFile(nonExistentPath), false);
    assert.equal(trustStore.loadFromFile(corruptPath), false);
  });

  await t.test("importState throws TrustError on invalid snapshot version", () => {
    assert.throws(
      () => {
        // @ts-expect-error testing invalid structure
        trustStore.importState({ version: 2 });
      },
      (err: unknown) => err instanceof TrustError && err.code === "invalid_proof",
    );
  });
});
