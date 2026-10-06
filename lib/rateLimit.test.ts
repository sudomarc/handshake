import test from 'node:test';
import assert from 'node:assert/strict';
import { consume, resetRateLimits } from './rateLimit.ts';

test('consume allows up to max attempts per window and blocks after', () => {
  resetRateLimits();
  const key = 'test-pair-1';
  const windowMs = 10000;
  const maxAttempts = 3;

  for (let i = 0; i < maxAttempts; i++) {
    const result = consume(key, maxAttempts, windowMs);
    assert.equal(result.allowed, true);
  }

  const blocked = consume(key, maxAttempts, windowMs);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.ok(blocked.retryAfterSeconds > 0);
  }
});

test('consume isolates different keys', () => {
  resetRateLimits();
  const windowMs = 10000;
  const maxAttempts = 2;

  consume('pair-A', maxAttempts, windowMs);
  consume('pair-A', maxAttempts, windowMs);
  assert.equal(consume('pair-A', maxAttempts, windowMs).allowed, false);

  assert.equal(consume('pair-B', maxAttempts, windowMs).allowed, true);
});
