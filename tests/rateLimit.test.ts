import test from "node:test";
import assert from "node:assert/strict";
import { consume, resetRateLimits } from "../lib/rateLimit.js";

test("lib/rateLimit - consume logic", async (t) => {
  t.beforeEach(() => {
    resetRateLimits();
  });

  await t.test("allows requests up to max limit", () => {
    const key = "test-ip-1";
    const max = 3;
    const windowMs = 60_000;
    const now = 1000;

    const res1 = consume(key, max, windowMs, now);
    assert.deepEqual(res1, { allowed: true, remaining: 2 });

    const res2 = consume(key, max, windowMs, now + 100);
    assert.deepEqual(res2, { allowed: true, remaining: 1 });

    const res3 = consume(key, max, windowMs, now + 200);
    assert.deepEqual(res3, { allowed: true, remaining: 0 });

    const res4 = consume(key, max, windowMs, now + 300);
    assert.strictEqual(res4.allowed, false);
    if (!res4.allowed) {
      assert.strictEqual(typeof res4.retryAfterSeconds, "number");
      assert.ok(res4.retryAfterSeconds > 0);
    }
  });

  await t.test("resets count when window expires", () => {
    const key = "test-ip-2";
    const max = 2;
    const windowMs = 10_000;
    const now = 1000;

    consume(key, max, windowMs, now);
    consume(key, max, windowMs, now);

    const blocked = consume(key, max, windowMs, now);
    assert.strictEqual(blocked.allowed, false);

    // Advance past the window (resetAt = 1000 - 1000 % 10000 + 10000 = 10000)
    const future = 10_001;
    const resAfterReset = consume(key, max, windowMs, future);
    assert.deepEqual(resAfterReset, { allowed: true, remaining: 1 });
  });

  await t.test("handles bucket capacity sweep when max buckets is reached", () => {
    const windowMs = 10_000;
    const now = 1000;

    // Fill up buckets with short-lived expired keys
    for (let i = 0; i < 10_000; i++) {
      consume(`key-${i}`, 1, windowMs, now);
    }

    // Now try at future time when old buckets have expired
    const future = 10_001;
    const res = consume("new-key", 1, windowMs, future);
    assert.deepEqual(res, { allowed: true, remaining: 0 });
  });
});
