import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CallSessionStore } from "../lib/callStore";

const testDir = join(tmpdir(), `call-store-test-${Date.now()}`);

function cleanupDir() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

describe("CallSessionStore persistence and state management", () => {
  afterEach(() => {
    cleanupDir();
    delete process.env.CALL_STORE_PATH;
  });

  test("createSession, setOffer, setAnswer, addIceCandidate, and endSession lifecycle", async () => {
    const store = new CallSessionStore();
    const pairId = "a".repeat(32);
    const callerId = "c".repeat(32);
    const calleeId = "e".repeat(32);

    const session = await store.createSession({ pairId, callerId });
    assert.equal(session.pairId, pairId);
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, callerId);

    const pending = await store.getPendingSessionForPair(pairId, calleeId);
    assert.ok(pending);
    assert.equal(pending.sessionId, session.sessionId);

    const offerRes = await store.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "v=0\r\noffer" },
      fromDeviceId: callerId,
    });
    assert.ok(offerRes);
    assert.equal(offerRes.offer?.sdp, "v=0\r\noffer");

    const answerRes = await store.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: "v=0\r\nanswer" },
      fromDeviceId: calleeId,
    });
    assert.ok(answerRes);
    assert.equal(answerRes.status, "active");
    assert.equal(answerRes.calleeDeviceId, calleeId);

    await store.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: callerId,
    });

    const candidatesForCallee = await store.getIceCandidates(session.sessionId, calleeId);
    assert.equal(candidatesForCallee.length, 1);
    assert.equal(candidatesForCallee[0].candidate, "candidate:1");

    const ended = await store.endSession(session.sessionId);
    assert.ok(ended);
    assert.equal(ended.status, "ended");
  });

  test("exportState and importState preserve sessions and candidates", async () => {
    const store1 = new CallSessionStore();
    const pairId = "b".repeat(32);
    const callerId = "c".repeat(32);

    const session = await store1.createSession({ pairId, callerId });
    await store1.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:abc", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: callerId,
    });

    const exported = store1.exportState();
    assert.ok(exported[session.sessionId]);
    assert.equal(exported[session.sessionId].pairId, pairId);
    assert.equal(exported[session.sessionId].iceCandidates.length, 1);

    const store2 = new CallSessionStore();
    store2.importState(exported);

    const fetched = await store2.getSession(session.sessionId);
    assert.ok(fetched);
    assert.equal(fetched.pairId, pairId);
    assert.equal(fetched.iceCandidates.length, 1);
    assert.equal(fetched.iceCandidates[0].candidate, "candidate:abc");
  });

  test("file-backed persistence automatically saves and loads state atomically", async () => {
    mkdirSync(testDir, { recursive: true });
    const dbPath = join(testDir, "call_sessions.json");

    const store1 = new CallSessionStore(dbPath);
    const pairId = "d".repeat(32);
    const callerId = "c".repeat(32);

    const session = await store1.createSession({ pairId, callerId });
    assert.ok(existsSync(dbPath));

    const store2 = new CallSessionStore(dbPath);
    const fetched = await store2.getSession(session.sessionId);
    assert.ok(fetched);
    assert.equal(fetched.pairId, pairId);
    assert.equal(fetched.callerDeviceId, callerId);
  });

  test("CALL_STORE_PATH env var configures store persistence", async () => {
    mkdirSync(testDir, { recursive: true });
    const dbPath = join(testDir, "env_call_sessions.json");
    process.env.CALL_STORE_PATH = dbPath;

    const store1 = new CallSessionStore();
    const pairId = "e".repeat(32);
    const callerId = "c".repeat(32);

    const session = await store1.createSession({ pairId, callerId });
    assert.ok(existsSync(dbPath));

    const store2 = new CallSessionStore();
    const fetched = await store2.getSession(session.sessionId);
    assert.ok(fetched);
    assert.equal(fetched.pairId, pairId);
  });
});
