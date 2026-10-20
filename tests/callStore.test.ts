import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CallSessionStore, callSessionStore } from "../lib/callStore";

describe("CallSessionStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "callstore-test-"));
    callSessionStore.reset();
  });

  afterEach(() => {
    delete process.env.CALL_STORE_PATH;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("creates and retrieves a call session", async () => {
    const session = await callSessionStore.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    assert.ok(session.sessionId);
    assert.equal(session.pairId, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, "11112222333344445555666677778888");
    assert.equal(session.calleeDeviceId, null);

    const retrieved = await callSessionStore.getSession(session.sessionId);
    assert.ok(retrieved);
    assert.equal(retrieved.sessionId, session.sessionId);
  });

  test("retrieves pending session for pair excluding caller device", async () => {
    const session = await callSessionStore.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    const pendingForA = await callSessionStore.getPendingSessionForPair(
      "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      "11112222333344445555666677778888",
    );
    assert.equal(pendingForA, null, "Caller should not see its own pending session");

    const pendingForB = await callSessionStore.getPendingSessionForPair(
      "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      "88887777666655554444333322221111",
    );
    assert.ok(pendingForB);
    assert.equal(pendingForB.sessionId, session.sessionId);
  });

  test("handles offer, answer, and ICE candidates flow", async () => {
    const session = await callSessionStore.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    const sessionWithOffer = await callSessionStore.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "v=0 offer sdp" },
      fromDeviceId: "11112222333344445555666677778888",
    });
    assert.ok(sessionWithOffer);
    assert.equal(sessionWithOffer.offer?.sdp, "v=0 offer sdp");

    const sessionWithAnswer = await callSessionStore.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: "v=0 answer sdp" },
      fromDeviceId: "88887777666655554444333322221111",
    });
    assert.ok(sessionWithAnswer);
    assert.equal(sessionWithAnswer.status, "active");
    assert.equal(sessionWithAnswer.calleeDeviceId, "88887777666655554444333322221111");

    await callSessionStore.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: "11112222333344445555666677778888",
    });

    await callSessionStore.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate:2", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: "88887777666655554444333322221111",
    });

    const candidatesForA = await callSessionStore.getIceCandidates(
      session.sessionId,
      "11112222333344445555666677778888",
    );
    assert.equal(candidatesForA.length, 1);
    assert.equal(candidatesForA[0].candidate, "candidate:2");

    const candidatesForB = await callSessionStore.getIceCandidates(
      session.sessionId,
      "88887777666655554444333322221111",
    );
    assert.equal(candidatesForB.length, 1);
    assert.equal(candidatesForB[0].candidate, "candidate:1");

    const ended = await callSessionStore.endSession(session.sessionId);
    assert.ok(ended);
    assert.equal(ended.status, "ended");
  });

  test("exports and imports store state correctly", async () => {
    const store1 = new CallSessionStore();
    const session = await store1.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    const exported = store1.exportState();
    assert.equal(exported.sessions.length, 1);
    assert.equal(exported.sessions[0].sessionId, session.sessionId);

    const store2 = new CallSessionStore();
    store2.importState(exported);

    const importedSession = await store2.getSession(session.sessionId);
    assert.ok(importedSession);
    assert.equal(importedSession.pairId, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
  });

  test("cleans up stale sessions older than 30 minutes", async () => {
    const store = new CallSessionStore();
    const session = await store.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    // Manually manipulate state to make session 31 minutes old
    const state = store.exportState();
    state.sessions[0].updatedAt = Date.now() - 31 * 60 * 1000;
    store.importState(state);

    store.cleanup();

    const retrieved = await store.getSession(session.sessionId);
    assert.equal(retrieved, null);
  });

  test("persists state atomically to disk when filePath is specified", async () => {
    const filePath = join(tempDir, "call-sessions.json");
    const store = new CallSessionStore(filePath);

    const session = await store.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    assert.ok(existsSync(filePath));
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.sessions.length, 1);
    assert.equal(parsed.sessions[0].sessionId, session.sessionId);

    // Reload from disk in a new store instance
    const store2 = new CallSessionStore(filePath);
    const loaded = await store2.getSession(session.sessionId);
    assert.ok(loaded);
    assert.equal(loaded.pairId, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
  });

  test("honors CALL_STORE_PATH environment variable", async () => {
    const filePath = join(tempDir, "env-call-store.json");
    process.env.CALL_STORE_PATH = filePath;

    const store = new CallSessionStore();
    const session = await store.createSession({
      pairId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      callerId: "11112222333344445555666677778888",
    });

    assert.ok(existsSync(filePath));
    const store2 = new CallSessionStore();
    const reloaded = await store2.getSession(session.sessionId);
    assert.ok(reloaded);
    assert.equal(reloaded.sessionId, session.sessionId);
  });
});
