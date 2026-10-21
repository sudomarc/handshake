import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, Server } from "node:http";
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

  test("consumeAsync works identically with MemoryRateLimiterStore", async () => {
    const store = new MemoryRateLimiterStore();
    const key = "async:key1";
    const max = 2;
    const windowMs = 60_000;
    const now = 1_000_000;

    const r1 = await consumeAsync(key, max, windowMs, now, store);
    assert.equal(r1.allowed, true);
    if (r1.allowed) assert.equal(r1.remaining, 1);

    const r2 = await consumeAsync(key, max, windowMs, now, store);
    assert.equal(r2.allowed, true);
    if (r2.allowed) assert.equal(r2.remaining, 0);

    const r3 = await consumeAsync(key, max, windowMs, now, store);
    assert.equal(r3.allowed, false);
  });

  test("RedisRateLimiterStore performs HTTP REST commands and fallback", async () => {
    const redisKv: Record<string, string> = {};
    const server: Server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const cmd = JSON.parse(body) as (string | number)[];
          const op = String(cmd[0]).toUpperCase();
          if (op === "GET") {
            const k = String(cmd[1]);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: redisKv[k] ?? null }));
          } else if (op === "SET") {
            const k = String(cmd[1]);
            const val = String(cmd[2]);
            redisKv[k] = val;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: "OK" }));
          } else if (op === "DEL") {
            const k = String(cmd[1]);
            delete redisKv[k];
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: 1 }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: "OK" }));
          }
        } catch {
          res.writeHead(400);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const serverUrl = `http://127.0.1:${port}`;

    try {
      const redisStore = new RedisRateLimiterStore({
        url: serverUrl,
        token: "test-token",
        timeoutMs: 1000,
      });

      const key = "redis:user:1";
      const now = 2_000_000;

      const r1 = await consumeAsync(key, 2, 60_000, now, redisStore);
      assert.equal(r1.allowed, true);

      const bucketInRedis = await redisStore.get(key);
      assert.notEqual(bucketInRedis, undefined);
      assert.equal(bucketInRedis?.count, 1);

      const r2 = await consumeAsync(key, 2, 60_000, now, redisStore);
      assert.equal(r2.allowed, true);

      const r3 = await consumeAsync(key, 2, 60_000, now, redisStore);
      assert.equal(r3.allowed, false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("RedisRateLimiterStore falls back gracefully on network failure", async () => {
    const unroutableStore = new RedisRateLimiterStore({
      url: "http://127.0.0.1:59999", // Unreachable port
      timeoutMs: 100,
    });

    const key = "fallback:test";
    const now = 3_000_000;

    // Should not throw, should fall back to memory store seamlessly
    const r1 = await consumeAsync(key, 2, 60_000, now, unroutableStore);
    assert.equal(r1.allowed, true);
    if (r1.allowed) assert.equal(r1.remaining, 1);

    // Synchronous consume on RedisRateLimiterStore routes to fallback store without error
    const r2 = consume(key, 2, 60_000, now, unroutableStore);
    assert.equal(r2.allowed, true);
    if (r2.allowed) assert.equal(r2.remaining, 0);
  });
});
