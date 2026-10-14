import assert from "node:assert/strict";
import { test, describe, beforeEach } from "node:test";
import { consume, resetRateLimits } from "../lib/rateLimit";

describe("lib/rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test("allows requests up to the maximum limit within a window", () => {
    const key = "test-client-ip";
    const max = 3;
    const windowMs = 60_000;
    const now = 1_000_000;

    const res1 = consume(key, max, windowMs, now);
    assert.equal(res1.allowed, true);
    if (res1.allowed) {
      assert.equal(res1.remaining, 2);
    }

    const res2 = consume(key, max, windowMs, now + 100);
    assert.equal(res2.allowed, true);
    if (res2.allowed) {
      assert.equal(res2.remaining, 1);
    }

    const res3 = consume(key, max, windowMs, now + 200);
    assert.equal(res3.allowed, true);
    if (res3.allowed) {
      assert.equal(res3.remaining, 0);
    }

    const res4 = consume(key, max, windowMs, now + 300);
    assert.equal(res4.allowed, false);
    if (!res4.allowed) {
      assert.ok(res4.retryAfterSeconds > 0);
    }
  });

  test("resets count once window boundary passes", () => {
    const key = "test-client-ip";
    const max = 2;
    const windowMs = 10_000;
    const now = 10_000; // aligned window

    consume(key, max, windowMs, now);
    consume(key, max, windowMs, now + 100);

    const blocked = consume(key, max, windowMs, now + 200);
    assert.equal(blocked.allowed, false);

    // Advance time beyond windowMs boundary
    const nextWindowNow = now + windowMs + 100;
    const allowedNew = consume(key, max, windowMs, nextWindowNow);
    assert.equal(allowedNew.allowed, true);
    if (allowedNew.allowed) {
      assert.equal(allowedNew.remaining, 1);
    }
  });

  test("tracks separate keys independently", () => {
    const max = 1;
    const windowMs = 60_000;
    const now = 1_000_000;

    const resA1 = consume("keyA", max, windowMs, now);
    assert.equal(resA1.allowed, true);

    const resA2 = consume("keyA", max, windowMs, now);
    assert.equal(resA2.allowed, false);

    const resB1 = consume("keyB", max, windowMs, now);
    assert.equal(resB1.allowed, true);
  });

  test("resetRateLimits clears all bucket state", () => {
    const key = "test-client-ip";
    const max = 1;
    const windowMs = 60_000;
    const now = 1_000_000;

    consume(key, max, windowMs, now);
    assert.equal(consume(key, max, windowMs, now).allowed, false);

    resetRateLimits();

    assert.equal(consume(key, max, windowMs, now).allowed, true);
  });

  test("refuses requests when MAX_BUCKETS (10,000) capacity is exhausted with live buckets", () => {
    const max = 5;
    const windowMs = 60_000;
    const now = 1_000_000;

    // Fill map up to 10,000 live buckets
    for (let i = 0; i < 10_000; i++) {
      consume(`bucket-${i}`, max, windowMs, now);
    }

    // 10,001st bucket when no buckets are expired
    const overflow = consume("overflow-bucket", max, windowMs, now);
    assert.equal(overflow.allowed, false);
    if (!overflow.allowed) {
      assert.ok(overflow.retryAfterSeconds > 0);
    }
  });
});
