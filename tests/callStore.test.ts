import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

import {
  CallSessionStore,
  getCallSessionStore,
  resetCallSessions,
  setCallSessionStore,
} from "../lib/callStore";

describe("CallSessionStore persistence & lifecycle", () => {
  test("creates, retrieves, and updates call sessions", async () => {
    const store = new CallSessionStore();
    const session = await store.createSession({
      pairId: "pair-123",
      callerId: "device-caller-1",
    });

    assert.ok(session.sessionId);
    assert.equal(session.pairId, "pair-123");
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, "device-caller-1");

    // Fetch session
    const retrieved = await store.getSession(session.sessionId);
    assert.ok(retrieved);
    assert.equal(retrieved.sessionId, session.sessionId);

    // Set offer
    const withOffer = await store.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "v=0..." },
      fromDeviceId: "device-caller-1",
    });
    assert.ok(withOffer);
    assert.deepEqual(withOffer.offer, { type: "offer", sdp: "v=0..." });

    // Set answer
    const withAnswer = await store.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: "v=0..." },
      fromDeviceId: "device-callee-1",
    });
    assert.ok(withAnswer);
    assert.equal(withAnswer.status, "active");
    assert.equal(withAnswer.calleeDeviceId, "device-callee-1");

    // Add ICE candidate
    const withIce = await store.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:1...", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: "device-caller-1",
    });
    assert.ok(withIce);
    assert.equal(withIce.iceCandidates.length, 1);

    // Get ICE candidates for callee (filter out caller's)
    const candidatesForCallee = await store.getIceCandidates(session.sessionId, "device-callee-1");
    assert.equal(candidatesForCallee.length, 1);

    // End session
    const ended = await store.endSession(session.sessionId);
    assert.ok(ended);
    assert.equal(ended.status, "ended");
  });

  test("exportState and importState preserve sessions", async () => {
    const store1 = new CallSessionStore();
    const s1 = await store1.createSession({
      pairId: "pair-abc",
      callerId: "dev-1",
    });
    await store1.setOffer(s1.sessionId, {
      sessionId: s1.sessionId,
      offer: { type: "offer", sdp: "sdp-data" },
      fromDeviceId: "dev-1",
    });

    const state = store1.exportState();
    assert.ok(state[s1.sessionId]);

    const store2 = new CallSessionStore();
    store2.importState(state);

    const imported = await store2.getSession(s1.sessionId);
    assert.ok(imported);
    assert.equal(imported.pairId, "pair-abc");
    assert.deepEqual(imported.offer, { type: "offer", sdp: "sdp-data" });
  });

  test("cleanup sweeps sessions older than 30 minutes", async () => {
    const store = new CallSessionStore();
    const s1 = await store.createSession({
      pairId: "pair-old",
      callerId: "dev-1",
    });

    const now = Date.now();
    // Simulate s1 being 31 minutes old
    const expiredTime = now + 31 * 60 * 1000;

    const removed = store.cleanup(expiredTime);
    assert.equal(removed, 1);

    const check = await store.getSession(s1.sessionId);
    assert.equal(check, null);
  });

  test("file-backed persistence automatically saves and loads state atomically", async () => {
    const testFile = join(tmpdir(), `call-store-test-${Date.now()}-${Math.random()}.json`);

    try {
      const store1 = new CallSessionStore(testFile);
      const session = await store1.createSession({
        pairId: "pair-file",
        callerId: "dev-file-1",
      });

      assert.ok(existsSync(testFile));

      // Load new instance from same file
      const store2 = new CallSessionStore(testFile);
      const loaded = await store2.getSession(session.sessionId);
      assert.ok(loaded);
      assert.equal(loaded.pairId, "pair-file");
      assert.equal(loaded.callerDeviceId, "dev-file-1");
    } finally {
      if (existsSync(testFile)) {
        rmSync(testFile, { force: true });
      }
    }
  });

  test("CALL_STORE_PATH env var configures store persistence", async () => {
    const testFile = join(tmpdir(), `call-store-env-test-${Date.now()}-${Math.random()}.json`);
    const origEnv = process.env.CALL_STORE_PATH;

    try {
      process.env.CALL_STORE_PATH = testFile;
      const store = new CallSessionStore();

      const session = await store.createSession({
        pairId: "pair-env",
        callerId: "dev-env-1",
      });

      assert.ok(existsSync(testFile));
      const content = readFileSync(testFile, "utf-8");
      assert.ok(content.includes(session.sessionId));
    } finally {
      if (origEnv === undefined) {
        delete process.env.CALL_STORE_PATH;
      } else {
        process.env.CALL_STORE_PATH = origEnv;
      }
      if (existsSync(testFile)) {
        rmSync(testFile, { force: true });
      }
    }
  });

  test("getCallSessionStore, setCallSessionStore, and resetCallSessions helpers", async () => {
    const customStore = new CallSessionStore();
    const prevStore = getCallSessionStore();

    try {
      setCallSessionStore(customStore);
      assert.equal(getCallSessionStore(), customStore);

      const session = await customStore.createSession({
        pairId: "pair-helper",
        callerId: "dev-helper",
      });
      assert.ok(await customStore.getSession(session.sessionId));

      resetCallSessions();
      assert.equal(await customStore.getSession(session.sessionId), null);
    } finally {
      setCallSessionStore(prevStore);
    }
  });
});
