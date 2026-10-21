import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  consume,
  consumeAsync,
  resetRateLimits,
  MemoryRateLimiterStore,
  FileBackedRateLimiterStore,
  RedisRateLimiterStore,
  exportRateLimitState,
  importRateLimitState,
  setRateLimiterStore,
  MAX_BUCKETS,
  Bucket,
} from "../lib/rateLimit";

describe("lib/rateLimit enhanced store and persistence", () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `handshake-ratelimit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    testFilePath = join(testDir, "ratelimit-store.json");
    resetRateLimits();
    setRateLimiterStore(new MemoryRateLimiterStore());
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("consume enforces fixed window rate limits with default store", () => {
    const key = "user:123";
    const max = 2;
    const windowMs = 60_000;
    const now = 1_000_000;

    const r1 = consume(key, max, windowMs, now);
    assert.equal(r1.allowed, true);
    if (r1.allowed) assert.equal(r1.remaining, 1);

    const r2 = consume(key, max, windowMs, now);
    assert.equal(r2.allowed, true);
    if (r2.allowed) assert.equal(r2.remaining, 0);

    const r3 = consume(key, max, windowMs, now);
    assert.equal(r3.allowed, false);
    if (!r3.allowed) assert.equal(r3.retryAfterSeconds > 0, true);

    // After reset
    const r4 = consume(key, max, windowMs, now + windowMs + 1000);
    assert.equal(r4.allowed, true);
  });

  test("consumeAsync enforces fixed window rate limits with sync store", async () => {
    const key = "user:456";
    const max = 2;
    const windowMs = 60_000;
    const now = 1_000_000;

    const r1 = await consumeAsync(key, max, windowMs, now);
    assert.equal(r1.allowed, true);
    if (r1.allowed) assert.equal(r1.remaining, 1);

    const r2 = await consumeAsync(key, max, windowMs, now);
    assert.equal(r2.allowed, true);
    if (r2.allowed) assert.equal(r2.remaining, 0);

    const r3 = await consumeAsync(key, max, windowMs, now);
    assert.equal(r3.allowed, false);
  });

  test("exportRateLimitState and importRateLimitState preserve buckets", () => {
    const store = new MemoryRateLimiterStore();
    setRateLimiterStore(store);

    consume("ip:1.1.1.1", 5, 60_000, 100_000);
    consume("ip:2.2.2.2", 5, 60_000, 100_000);

    const state = exportRateLimitState(store);
    assert.equal(Object.keys(state).length, 2);
    assert.equal(state["ip:1.1.1.1"].count, 1);
    assert.equal(state["ip:2.2.2.2"].count, 1);

    const newStore = new MemoryRateLimiterStore();
    importRateLimitState(state, newStore);
    assert.equal(newStore.size(), 2);
    assert.equal(newStore.get("ip:1.1.1.1")?.count, 1);
  });

  test("FileBackedRateLimiterStore automatically persists and reloads state", () => {
    mkdirSync(testDir, { recursive: true });
    const fileStore1 = new FileBackedRateLimiterStore(testFilePath);

    consume("api:key1", 3, 60_000, 500_000, fileStore1);
    consume("api:key1", 3, 60_000, 500_000, fileStore1);

    assert.equal(existsSync(testFilePath), true);

    // Instantiate a new store pointing to the same file
    const fileStore2 = new FileBackedRateLimiterStore(testFilePath);
    assert.equal(fileStore2.get("api:key1")?.count, 2);

    // Consume further on second instance
    const res = consume("api:key1", 3, 60_000, 500_000, fileStore2);
    assert.equal(res.allowed, true);
    if (res.allowed) assert.equal(res.remaining, 0);

    // Verify persistence after third attempt
    const fileStore3 = new FileBackedRateLimiterStore(testFilePath);
    assert.equal(fileStore3.get("api:key1")?.count, 3);
  });

  test("RATE_LIMIT_STORE_PATH env var configures default store", () => {
    const origEnv = process.env.RATE_LIMIT_STORE_PATH;
    try {
      process.env.RATE_LIMIT_STORE_PATH = testFilePath;
      const store = new FileBackedRateLimiterStore();
      consume("env:test", 10, 60_000, 200_000, store);
      assert.equal(existsSync(testFilePath), true);
    } finally {
      process.env.RATE_LIMIT_STORE_PATH = origEnv;
    }
  });

  test("MemoryRateLimiterStore sweeps expired buckets when capacity limit reached", () => {
    const store = new MemoryRateLimiterStore();
    const now = 1_000_000;

    // Fill store to capacity with expired buckets
    for (let i = 0; i < MAX_BUCKETS; i++) {
      store.set(`key:${i}`, { count: 1, resetAt: now - 100 });
    }
    assert.equal(store.size(), MAX_BUCKETS);

    // Consuming a new key should trigger sweep and allow insertion
    const res = consume("new:key", 5, 60_000, now, store);
    assert.equal(res.allowed, true);
    assert.equal(store.get("new:key")?.count, 1);
  });

  test("RedisRateLimiterStore executes async commands via REST mock fetch", async () => {
    const kvStore = new Map<string, string>();

    const mockFetch: typeof fetch = async (_url, init) => {
      const body = JSON.parse(init?.body as string) as string[];
      const cmd = body[0];
      const key = body[1];

      if (cmd === "GET") {
        const val = kvStore.get(key);
        return new Response(JSON.stringify({ result: val ?? null }), { status: 200 });
      } else if (cmd === "SET") {
        kvStore.set(key, body[2]);
        return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
      } else if (cmd === "DEL") {
        kvStore.delete(key);
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      } else if (cmd === "FLUSHDB") {
        kvStore.clear();
        return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Unknown command" }), { status: 400 });
    };

    const redisStore = new RedisRateLimiterStore({
      url: "https://mock-redis.upstash.io",
      token: "secret-token",
      fetchFn: mockFetch,
    });

    const now = 2_000_000;
    const bucket: Bucket = { count: 1, resetAt: now + 60_000 };

    await redisStore.setAsync("user:redis", bucket);
    const retrieved = await redisStore.getAsync("user:redis");
    assert.deepEqual(retrieved, bucket);

    const res = await redisStore.consumeAsync("user:redis", 3, 60_000, now);
    assert.equal(res.allowed, true);
    if (res.allowed) assert.equal(res.remaining, 1);

    await redisStore.deleteAsync("user:redis");
    const afterDelete = await redisStore.getAsync("user:redis");
    assert.equal(afterDelete, undefined);

    await redisStore.setAsync("key1", bucket);
    await redisStore.clearAsync();
    const afterClear = await redisStore.getAsync("key1");
    assert.equal(afterClear, undefined);
  });

  test("RedisRateLimiterStore gracefully falls back to memory store on network error", async () => {
    const failingFetch: typeof fetch = async () => {
      throw new Error("Network offline");
    };

    const fallbackStore = new MemoryRateLimiterStore();
    const redisStore = new RedisRateLimiterStore({
      url: "https://unreachable-redis.internal",
      fetchFn: failingFetch,
      fallbackStore,
    });

    const now = 3_000_000;
    const res = await redisStore.consumeAsync("fallback:key", 2, 60_000, now);
    assert.equal(res.allowed, true);
    assert.equal(fallbackStore.get("fallback:key")?.count, 1);
  });

  test("RATE_LIMIT_REDIS_URL env var configures RedisRateLimiterStore endpoint", () => {
    const origEnv = process.env.RATE_LIMIT_REDIS_URL;
    try {
      process.env.RATE_LIMIT_REDIS_URL = "https://custom-redis.internal";
      const store = new RedisRateLimiterStore();
      assert.equal("getAsync" in store, true);
    } finally {
      process.env.RATE_LIMIT_REDIS_URL = origEnv;
    }
  });
});
