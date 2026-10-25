import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";
import { resetMockSecureStore } from "./mocks/register-react-native";
import { runCallTrust, type CallTrustResult } from "../mobile/lib/trust/session";
import {
  getDeviceId,
  getDeviceSecret,
  clearDeviceIdentity,
} from "../mobile/lib/trust/deviceIdentity";
import { addPair, getAllPairs, removePair, updatePair } from "../mobile/lib/storage";

describe("runCallTrust offline and fallback behavior", () => {
  beforeEach(() => {
    resetMockSecureStore();
  });

  test("returns verify state when no trusted circle exists without attempting session", async () => {
    const progressUpdates: CallTrustResult[] = [];
    const result = await runCallTrust({
      pairId: "pair-123",
      role: "initiator",
      hasTrustedCircle: false,
      deviceAuthorized: true,
      riskDetected: false,
      onProgress: (p) => progressUpdates.push(p),
    });

    assert.equal(result.state, "verify");
    assert.equal(result.backendReachable, true);
    assert.equal(result.sessionAttempted, false);
    assert.equal(result.sessionId, null);
    assert.equal(result.peerDeviceId, null);
    assert.ok(progressUpdates.length >= 1);
  });

  test("handles network failure gracefully and returns offline state", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("Network request failed");
    };

    try {
      const result = await runCallTrust({
        pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
        role: "initiator",
        hasTrustedCircle: true,
        deviceAuthorized: true,
        riskDetected: false,
        timeoutMs: 100,
      });

      assert.equal(result.state, "offline");
      assert.equal(result.backendReachable, false);
      assert.equal(result.sessionId, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("deviceIdentity and storage in mobile environment", () => {
  beforeEach(() => {
    resetMockSecureStore();
  });

  test("getDeviceId and getDeviceSecret generate and persist unique keys", async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    assert.equal(id1, id2);
    assert.match(id1, /^[a-f0-9]{32}$/);

    const sec1 = await getDeviceSecret();
    const sec2 = await getDeviceSecret();
    assert.equal(sec1, sec2);
    assert.match(sec1, /^[a-f0-9]{64}$/);

    await clearDeviceIdentity();

    const id3 = await getDeviceId();
    assert.notEqual(id1, id3);
  });

  test("SecureStore pair storage operations: add, update, getAll, remove", async () => {
    let pairs = await getAllPairs();
    assert.equal(pairs.length, 0);

    await addPair("pair-1", "Alice");
    pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].pairId, "pair-1");
    assert.equal(pairs[0].name, "Alice");

    // Idempotent add for existing pairId
    await addPair("pair-1", "Duplicate Alice");
    pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].name, "Alice");

    await updatePair("pair-1", { name: "Alice Updated" });
    pairs = await getAllPairs();
    assert.equal(pairs[0].name, "Alice Updated");

    await removePair("pair-1");
    pairs = await getAllPairs();
    assert.equal(pairs.length, 0);
  });
});
