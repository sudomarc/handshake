import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CallSessionStore, type CallSessionStoreState } from "../lib/callStore";

describe("CallSessionStore signaling and persistence", () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `handshake-callstore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    testFilePath = join(testDir, "call-store.json");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("signaling operations: create, offer, answer, ice candidates, end", async () => {
    const store = new CallSessionStore();
    const pairId = "pair-12345678901234567890123456789012";
    const callerId = "caller-device-1";
    const calleeId = "callee-device-2";

    // Create session
    const session = await store.createSession({ pairId, callerId });
    assert.ok(session.sessionId);
    assert.equal(session.pairId, pairId);
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, callerId);

    // Get pending session
    const pending = await store.getPendingSessionForPair(pairId, calleeId);
    assert.ok(pending);
    assert.equal(pending?.sessionId, session.sessionId);

    // Set offer
    const offerSdp = "v=0\r\no=- 123456 2 IN IP4 127.0.0.1...";
    const updatedOffer = await store.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: offerSdp },
      fromDeviceId: callerId,
    });
    assert.ok(updatedOffer);
    assert.equal(updatedOffer?.offer?.sdp, offerSdp);

    // Set answer
    const answerSdp = "v=0\r\no=- 654321 2 IN IP4 127.0.0.1...";
    const updatedAnswer = await store.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: answerSdp },
      fromDeviceId: calleeId,
    });
    assert.ok(updatedAnswer);
    assert.equal(updatedAnswer?.status, "active");
    assert.equal(updatedAnswer?.calleeDeviceId, calleeId);
    assert.equal(updatedAnswer?.answer?.sdp, answerSdp);

    // Add ICE candidates
    await store.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: callerId,
    });
    await store.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:2", sdpMid: "1", sdpMLineIndex: 1 },
      fromDeviceId: calleeId,
    });

    // Get ICE candidates for callee (should return caller's candidates)
    const calleeCandidates = await store.getIceCandidates(session.sessionId, calleeId);
    assert.equal(calleeCandidates.length, 1);
    assert.equal(calleeCandidates[0].candidate, "candidate:1");

    // End session
    const ended = await store.endSession(session.sessionId);
    assert.equal(ended?.status, "ended");
  });

  test("exportState and importState preserve call sessions", async () => {
    const store1 = new CallSessionStore();
    const pairId = "pair-99999999999999999999999999999999";
    const session = await store1.createSession({ pairId, callerId: "caller-a" });
    await store1.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "offer-sdp-test" },
      fromDeviceId: "caller-a",
    });

    const exported: CallSessionStoreState = store1.exportState();
    assert.equal(exported.sessions.length, 1);
    assert.equal(exported.sessions[0].sessionId, session.sessionId);
    assert.equal(exported.sessions[0].offer?.sdp, "offer-sdp-test");

    const store2 = new CallSessionStore();
    store2.importState(exported);

    const importedSession = await store2.getSession(session.sessionId);
    assert.ok(importedSession);
    assert.equal(importedSession?.sessionId, session.sessionId);
    assert.equal(importedSession?.offer?.sdp, "offer-sdp-test");
  });

  test("FileBacked atomic persistence automatically saves and loads state", async () => {
    mkdirSync(testDir, { recursive: true });
    const store1 = new CallSessionStore(testFilePath);

    const pairId = "pair-77777777777777777777777777777777";
    const session = await store1.createSession({ pairId, callerId: "caller-b" });
    await store1.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "persisted-sdp" },
      fromDeviceId: "caller-b",
    });

    assert.equal(existsSync(testFilePath), true);

    // Load in a second store instance
    const store2 = new CallSessionStore(testFilePath);
    const loaded = await store2.getSession(session.sessionId);
    assert.ok(loaded);
    assert.equal(loaded?.pairId, pairId);
    assert.equal(loaded?.offer?.sdp, "persisted-sdp");
  });

  test("CALL_STORE_PATH env var configures store persistence", async () => {
    const origEnv = process.env.CALL_STORE_PATH;
    try {
      process.env.CALL_STORE_PATH = testFilePath;
      const store = new CallSessionStore();
      const pairId = "pair-88888888888888888888888888888888";
      await store.createSession({ pairId, callerId: "caller-c" });
      assert.equal(existsSync(testFilePath), true);
    } finally {
      process.env.CALL_STORE_PATH = origEnv;
    }
  });

  test("cleanup removes sessions older than 30 minutes", async () => {
    const store = new CallSessionStore();
    const pairId = "pair-55555555555555555555555555555555";
    const session = await store.createSession({ pairId, callerId: "caller-d" });

    // Artificially modify updatedAt to 35 minutes ago
    const state = store.exportState();
    state.sessions[0].updatedAt = Date.now() - 35 * 60 * 1000;
    store.importState(state);

    store.cleanup();
    const cleanedSession = await store.getSession(session.sessionId);
    assert.equal(cleanedSession, null);
  });
});
