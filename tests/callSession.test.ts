/**
 * Call session lifecycle tests.
 *
 * Guarantees under test: duplicate starts are swallowed, stale transitions from
 * an old call can never overwrite a new one, and a missed idle event cannot
 * leave a phantom call running forever.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { CallSessionManager } from "../mobile/lib/call/callSession";

describe("CallSessionManager", () => {
  test("begin starts a session in the ringing phase", () => {
    const m = new CallSessionManager();
    const s = m.begin("sim", 1000);
    assert.ok(s);
    assert.equal(s.phase, "ringing");
    assert.equal(m.isActive, true);
  });

  test("a second begin while active is a duplicate and returns null", () => {
    const m = new CallSessionManager();
    m.begin("sim", 1000);
    assert.equal(m.begin("sim", 1500), null);
  });

  test("a begin right after an end inside the dedupe window is swallowed", () => {
    const m = new CallSessionManager({ dedupeWindowMs: 2000 });
    const s = m.begin("sim", 1000);
    m.finish(s!.id, 1200);
    // Android often emits a spurious idle→active pair around call setup.
    assert.equal(m.begin("sim", 1500), null, "spurious restart should be deduped");
    // After the window, a genuine new call is accepted.
    assert.ok(m.begin("sim", 4000));
  });

  test("transition advances the phase for the live session", () => {
    const m = new CallSessionManager();
    const s = m.begin("sim", 1000)!;
    assert.equal(m.transition(s.id, "active", 2000), true);
    assert.equal(m.session!.phase, "active");
  });

  test("a stale transition from an old session is rejected", () => {
    const m = new CallSessionManager({ dedupeWindowMs: 0 });
    const old = m.begin("sim", 1000)!;
    m.finish(old.id, 2000);
    const next = m.begin("whatsapp", 5000)!;
    // The old call's late transition must not touch the new session.
    assert.equal(m.transition(old.id, "active", 6000), false);
    assert.equal(m.session!.id, next.id);
    assert.equal(m.session!.phase, "ringing");
  });

  test("finish only ends the matching live session", () => {
    const m = new CallSessionManager({ dedupeWindowMs: 0 });
    const s = m.begin("sim", 1000)!;
    assert.equal(m.finish("call-999", 2000), false, "wrong id must not end the session");
    assert.equal(m.isActive, true);
    assert.equal(m.finish(s.id, 2000), true);
    assert.equal(m.isActive, false);
  });

  test("a session with no transition past the timeout expires", () => {
    const m = new CallSessionManager({ sessionTimeoutMs: 60_000 });
    const s = m.begin("sim", 1000)!;
    assert.equal(m.isExpired(s, 30_000), false);
    assert.equal(m.isExpired(s, 70_000), true);
  });

  test("begin expires a phantom call (missed idle) instead of blocking forever", () => {
    // A missed `idle` leaves `current` non-null. Without the expiry check in
    // `begin`, this abandoned session would block every future call forever.
    const m = new CallSessionManager({ sessionTimeoutMs: 60_000, dedupeWindowMs: 0 });
    const phantom = m.begin("sim", 1000)!;
    assert.equal(m.isActive, true);
    // Long after the timeout, a genuinely new call arrives with no idle seen.
    const next = m.begin("whatsapp", 200_000);
    assert.ok(next, "a new call must be accepted once the phantom expired");
    assert.notEqual(next!.id, phantom.id, "the phantom is replaced by the new session");
    assert.equal(m.session!.id, next!.id);
  });

  test("transition to 'ended' routes through finish (no half-ended session)", () => {
    const m = new CallSessionManager();
    const s = m.begin("sim", 1000)!;
    assert.equal(m.transition(s.id, "ended", 2000), true);
    // It must not leave `current` set with phase "ended": `finish` clears it.
    assert.equal(m.isActive, false, "current must be cleared, not just marked ended");
    assert.equal(m.session, null);
  });

  test("tick expires a quiet phantom call so it cannot run forever", () => {
    const m = new CallSessionManager({ sessionTimeoutMs: 60_000 });
    m.begin("sim", 1000);
    assert.equal(m.tick(20_000), false, "still fresh, nothing expired");
    assert.equal(m.isActive, true);
    assert.equal(m.tick(200_000), true, "quiet session is expired");
    assert.equal(m.isActive, false);
  });

  test("an expired session rejects transitions and requires a fresh begin", () => {
    const m = new CallSessionManager({ sessionTimeoutMs: 60_000, dedupeWindowMs: 0 });
    const s = m.begin("sim", 1000)!;
    // A transition after the timeout expires the session and is rejected.
    assert.equal(m.transition(s.id, "active", 200_000), false);
    assert.equal(m.isActive, false);
    assert.ok(m.begin("meet", 300_000), "a new call can begin after expiry");
  });

  test("sessions record their call kind", () => {
    const m = new CallSessionManager();
    assert.equal(m.begin("whatsapp", 1000)!.kind, "whatsapp");
  });
});
