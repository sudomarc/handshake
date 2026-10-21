import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { CallSessionStore, callSessionStore } from "../lib/callStore";

const VALID_PAIR_ID = "12345678901234567890123456789012";
const CALLER_ID = "caller12345678901234567890123456";
const CALLEE_ID = "callee12345678901234567890123456";

describe("CallSessionStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "callstore-test-"));
    callSessionStore.reset();
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.CALL_STORE_PATH;
  });

  test("lifecycle: createSession, getSession, setOffer, setAnswer, addIceCandidate, endSession", async () => {
    const store = new CallSessionStore();

    // 1. Create Session
    const session = await store.createSession({
      pairId: VALID_PAIR_ID,
      callerId: CALLER_ID,
    });
    assert.ok(session.sessionId);
    assert.equal(session.pairId, VALID_PAIR_ID);
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, CALLER_ID);
    assert.equal(session.calleeDeviceId, null);

    // 2. Fetch Session
    const fetched = await store.getSession(session.sessionId);
    assert.deepEqual(fetched, session);

    // 3. Pending session for pair
    const pending = await store.getPendingSessionForPair(VALID_PAIR_ID, CALLEE_ID);
    assert.ok(pending);
    assert.equal(pending.sessionId, session.sessionId);

    // 4. Set Offer
    const offerSdp = "v=0\r\no=- 123456 2 IN IP4 127.0.0.1";
    const withOffer = await store.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: offerSdp },
      fromDeviceId: CALLER_ID,
    });
    assert.ok(withOffer?.offer);
    assert.equal(withOffer.offer.sdp, offerSdp);

    // 5. Set Answer
    const answerSdp = "v=0\r\no=- 654321 2 IN IP4 127.0.0.1";
    const withAnswer = await store.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: answerSdp },
      fromDeviceId: CALLEE_ID,
    });
    assert.ok(withAnswer);
    assert.equal(withAnswer.status, "active");
    assert.equal(withAnswer.calleeDeviceId, CALLEE_ID);

    // 6. ICE Candidate exchange
    await store.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: CALLER_ID,
    });

    const candidatesForCallee = await store.getIceCandidates(session.sessionId, CALLEE_ID);
    assert.equal(candidatesForCallee.length, 1);
    assert.equal(candidatesForCallee[0].candidate, "candidate:1");

    const candidatesForCaller = await store.getIceCandidates(session.sessionId, CALLER_ID);
    assert.equal(candidatesForCaller.length, 0);

    // 7. End session
    const ended = await store.endSession(session.sessionId);
    assert.equal(ended?.status, "ended");
  });

  test("exportState and importState preserve sessions", async () => {
    const storeA = new CallSessionStore();
    const session = await storeA.createSession({
      pairId: VALID_PAIR_ID,
      callerId: CALLER_ID,
    });
    await storeA.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "offer-sdp" },
      fromDeviceId: CALLER_ID,
    });

    const exported = storeA.exportState();
    assert.equal(exported.sessions.length, 1);
    assert.equal(exported.sessions[0].sessionId, session.sessionId);
    assert.equal(exported.sessions[0].offer?.sdp, "offer-sdp");

    const storeB = new CallSessionStore();
    storeB.importState(exported);

    const rehydrated = await storeB.getSession(session.sessionId);
    assert.ok(rehydrated);
    assert.equal(rehydrated.pairId, VALID_PAIR_ID);
    assert.equal(rehydrated.offer?.sdp, "offer-sdp");
  });

  test("file-backed persistence automatically saves and loads state atomically", async () => {
    const filePath = join(tempDir, "call-sessions.json");
    const storeA = new CallSessionStore(filePath);

    const session = await storeA.createSession({
      pairId: VALID_PAIR_ID,
      callerId: CALLER_ID,
    });
    await storeA.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "sdp-persisted" },
      fromDeviceId: CALLER_ID,
    });

    assert.ok(existsSync(filePath));
    const raw = readFileSync(filePath, "utf-8");
    assert.match(raw, /sdp-persisted/);

    // Load in new instance from file
    const storeB = new CallSessionStore(filePath);
    const loaded = await storeB.getSession(session.sessionId);
    assert.ok(loaded);
    assert.equal(loaded.offer?.sdp, "sdp-persisted");
  });

  test("CALL_STORE_PATH env var configures store persistence", async () => {
    const filePath = join(tempDir, "env-call-store.json");
    process.env.CALL_STORE_PATH = filePath;

    const storeA = new CallSessionStore();
    const session = await storeA.createSession({
      pairId: VALID_PAIR_ID,
      callerId: CALLER_ID,
    });

    assert.ok(existsSync(filePath));

    const storeB = new CallSessionStore();
    const loaded = await storeB.getSession(session.sessionId);
    assert.ok(loaded);
  });

  test("cleanup removes stale sessions older than 30 minutes", async () => {
    const store = new CallSessionStore();
    const session = await store.createSession({
      pairId: VALID_PAIR_ID,
      callerId: CALLER_ID,
    });

    // Manually age the session
    const agedSession = await store.getSession(session.sessionId);
    if (agedSession) {
      agedSession.updatedAt = Date.now() - 31 * 60 * 1000; // 31 minutes ago
      store.importState({ sessions: [agedSession] });
    }

    store.cleanup();
    const cleaned = await store.getSession(session.sessionId);
    assert.equal(cleaned, null);
  });
});
