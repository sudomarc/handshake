import assert from "node:assert/strict";
import { test, describe, beforeEach } from "node:test";
import { consume, resetRateLimits } from "../lib/rateLimit";

describe("lib/rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test("consume increments count within same window", () => {
    const key = "user-1";
    const now = 1000000;
    const windowMs = 60000;
    const max = 3;

    const r1 = consume(key, max, windowMs, now);
    assert.deepEqual(r1, { allowed: true, remaining: 2 });

    const r2 = consume(key, max, windowMs, now + 100);
    assert.deepEqual(r2, { allowed: true, remaining: 1 });

    const r3 = consume(key, max, windowMs, now + 200);
    assert.deepEqual(r3, { allowed: true, remaining: 0 });

    const r4 = consume(key, max, windowMs, now + 300);
    assert.equal(r4.allowed, false);
    if (!r4.allowed) {
      assert.equal(typeof r4.retryAfterSeconds, "number");
      assert.ok(r4.retryAfterSeconds > 0);
    }
  });

  test("window alignment resets count when moving into next window", () => {
    const key = "user-2";
    const windowMs = 30000; // 30s
    const max = 2;
    // Align time: 1000000 % 30000 = 10000, window resets at 1020000
    const now = 1000000;

    consume(key, max, windowMs, now);
    consume(key, max, windowMs, now);
    const blocked = consume(key, max, windowMs, now);
    assert.equal(blocked.allowed, false);

    // Jump past current window reset (now=1020001)
    const resetTime = now - (now % windowMs) + windowMs + 1;
    const rAfterReset = consume(key, max, windowMs, resetTime);
    assert.equal(rAfterReset.allowed, true);
    if (rAfterReset.allowed) {
      assert.equal(rAfterReset.remaining, 1);
    }
  });

  test("calculates accurate retryAfterSeconds when rate limited", () => {
    const key = "user-3";
    const windowMs = 60000;
    const max = 1;
    const now = 1000000; // window resetAt = 1020000 (20s remaining)

    consume(key, max, windowMs, now);
    const result = consume(key, max, windowMs, now + 5000); // 15s remaining = 15000ms -> 15s
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.retryAfterSeconds, 15);
    }
  });

  test("sweeps expired buckets when MAX_BUCKETS is reached", () => {
    const windowMs = 10000;
    const now = 100000;

    // Fill up to MAX_BUCKETS (10000) with expired buckets
    for (let i = 0; i < 10000; i++) {
      consume(`expired-key-${i}`, 5, windowMs, now - 20000); // expired 10s ago
    }

    // Now adding a new bucket should trigger sweep and succeed
    const res = consume("new-key", 5, windowMs, now);
    assert.equal(res.allowed, true);
  });

  test("refuses request if MAX_BUCKETS is reached with all live buckets", () => {
    const windowMs = 60000;
    const now = 1000000;

    // Fill up 10000 live buckets
    for (let i = 0; i < 10000; i++) {
      consume(`live-key-${i}`, 5, windowMs, now);
    }

    // Attempting to add 10001st key when all 10000 are active should be refused
    const res = consume("overflow-key", 5, windowMs, now);
    assert.equal(res.allowed, false);
    if (!res.allowed) {
      assert.equal(typeof res.retryAfterSeconds, "number");
    }
  });

  test("resetRateLimits clears all buckets", () => {
    const key = "user-4";
    const now = 1000000;
    consume(key, 1, 60000, now);

    assert.equal(consume(key, 1, 60000, now).allowed, false);

    resetRateLimits();

    assert.equal(consume(key, 1, 60000, now).allowed, true);
  });
});
