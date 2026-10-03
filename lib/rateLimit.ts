/**
 * Fixed-window rate limiter, in memory.
 *
 * Demo-grade on purpose: counters live in one server instance. On serverless hosting
 * several instances may run side by side, each with its own counters, so the effective
 * limit can be a small multiple of `max`. See SECURITY.md (T2) for the honest limit.
 */
type Bucket = { count: number; resetAt: number };

export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consume(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  // Windows are aligned to wall-clock multiples of windowMs, like the TOTP windows.
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      sweep(now);
      // Still full of live buckets: refuse rather than grow without bound.
      if (buckets.size >= MAX_BUCKETS)
        return { allowed: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
    }
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true, remaining: max - existing.count };
}

/** Test helper only. */
export function resetRateLimits() {
  buckets.clear();
}
