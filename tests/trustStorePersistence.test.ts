import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { trustStore, TrustStoreExport } from "../lib/trustStore";
import type { DeviceId, PairId } from "../lib/trustSchemas";

const PAIR_1 = "p1111111111111111111111111111111" as PairId;

describe("TrustStore Persistence", () => {
  let tmpDir: string;
  let testFilePath: string;

  beforeEach(() => {
    trustStore.reset();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "truststore-test-"));
    testFilePath = path.join(tmpDir, "truststore.json");
  });

  afterEach(() => {
    trustStore.reset();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("exportState and importState preserve devices, sessions, and invites", () => {
    const dev1 = trustStore.enroll({
      pairId: PAIR_1,
      deviceId: "d1111111111111111111111111111111" as DeviceId,
      deviceSecret: "s111111111111111111111111111111111111111111111111111111111111111",
      label: "Phone 1",
    });

    const invite = trustStore.createInvite({ ownerDisplayName: "Alice" });

    const exported = trustStore.exportState();
    assert.equal(exported.version, 1);
    assert.equal(exported.pairs.length, 1);
    assert.equal(exported.invites.length, 1);

    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    trustStore.importState(exported);
    const devices = trustStore.listDevices(PAIR_1);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, dev1.deviceId);
    assert.equal(devices[0].label, "Phone 1");

    const reloadedInvite = trustStore.getInvite(invite.inviteId);
    assert.ok(reloadedInvite);
    assert.equal(reloadedInvite?.ownerDisplayName, "Alice");
  });

  test("saveToFile and loadFromFile write atomically and restore state", () => {
    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: "d2222222222222222222222222222222" as DeviceId,
      deviceSecret: "s222222222222222222222222222222222222222222222222222222222222222",
      label: "Phone 2",
    });

    trustStore.saveToFile(testFilePath);
    assert.ok(fs.existsSync(testFilePath));

    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    const loaded = trustStore.loadFromFile(testFilePath);
    assert.equal(loaded, true);
    assert.equal(trustStore.listDevices(PAIR_1).length, 1);
  });

  test("autoSave persists changes when file path is provided", () => {
    // Re-initialize store by setting file path via saveToFile/loadFromFile lifecycle
    trustStore.saveToFile(testFilePath);
    // Bind file path to instance
    (trustStore as unknown as { filePath: string }).filePath = testFilePath;

    trustStore.enroll({
      pairId: PAIR_1,
      deviceId: "d3333333333333333333333333333333" as DeviceId,
      deviceSecret: "s333333333333333333333333333333333333333333333333333333333333333",
      label: "Phone 3",
    });

    // Reset memory
    trustStore.reset();
    assert.equal(trustStore.listDevices(PAIR_1).length, 0);

    // Read saved file
    trustStore.loadFromFile(testFilePath);
    assert.equal(trustStore.listDevices(PAIR_1).length, 1);
    assert.equal(trustStore.listDevices(PAIR_1)[0].label, "Phone 3");
  });

  test("loadFromFile returns false gracefully for non-existent or malformed file", () => {
    assert.equal(trustStore.loadFromFile(path.join(tmpDir, "nonexistent.json")), false);

    const corruptPath = path.join(tmpDir, "corrupt.json");
    fs.writeFileSync(corruptPath, "{ invalid json", "utf8");
    assert.equal(trustStore.loadFromFile(corruptPath), false);
  });

  test("importState throws Error for invalid format version", () => {
    assert.throws(
      () => trustStore.importState({ version: 2 } as unknown as TrustStoreExport),
      /Invalid or unsupported TrustStore data format/,
    );
  });
});
