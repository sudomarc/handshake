/**
 * Fixed-window rate limiter with pluggable store support, file-backed persistence,
 * and distributed Redis store integration.
 *
 * Supports in-memory storage (default), file-backed atomic persistence configured via
 * `RATE_LIMIT_STORE_PATH` environment variable, and Redis REST persistence configured via
 * `RATE_LIMIT_REDIS_URL` or `REDIS_URL` environment variables.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Bucket = { count: number; resetAt: number };

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export interface RateLimiterStore {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
  delete(key: string): void;
  clear(): void;
  entries(): IterableIterator<[string, Bucket]>;
  size(): number;
  sweep(now: number): void;
}

export interface AsyncRateLimiterStore {
  getAsync(key: string): Promise<Bucket | undefined>;
  setAsync(key: string, bucket: Bucket): Promise<void>;
  deleteAsync(key: string): Promise<void>;
  clearAsync(): Promise<void>;
  consumeAsync(
    key: string,
    max: number,
    windowMs: number,
    now?: number,
  ): Promise<RateLimitResult>;
}

export interface RedisRateLimiterStoreOptions {
  url?: string;
  token?: string;
  prefix?: string;
  fetchFn?: typeof fetch;
  fallbackStore?: RateLimiterStore;
}

export const MAX_BUCKETS = 10_000;

export class MemoryRateLimiterStore implements RateLimiterStore {
  private buckets = new Map<string, Bucket>();

  get(key: string): Bucket | undefined {
    return this.buckets.get(key);
  }

  set(key: string, bucket: Bucket): void {
    this.buckets.set(key, bucket);
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }

  entries(): IterableIterator<[string, Bucket]> {
    return this.buckets.entries();
  }

  size(): number {
    return this.buckets.size;
  }

  sweep(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

export class FileBackedRateLimiterStore implements RateLimiterStore {
  private memoryStore = new MemoryRateLimiterStore();
  private filePath: string | null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? process.env.RATE_LIMIT_STORE_PATH ?? null;
    if (this.filePath) {
      this.loadFromFile();
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as Record<string, Bucket>;
      this.memoryStore.clear();
      for (const [key, bucket] of Object.entries(parsed)) {
        if (bucket && typeof bucket.count === "number" && typeof bucket.resetAt === "number") {
          this.memoryStore.set(key, bucket);
        }
      }
    } catch {
      // Start clean on unreadable file
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      const dir = dirname(this.filePath);
      mkdirSync(dir, { recursive: true });
      const state = exportRateLimitState(this.memoryStore);
      const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
      writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
      renameSync(tmpPath, this.filePath);
    } catch {
      // Best effort persistence
    }
  }

  get(key: string): Bucket | undefined {
    return this.memoryStore.get(key);
  }

  set(key: string, bucket: Bucket): void {
    this.memoryStore.set(key, bucket);
    this.persist();
  }

  delete(key: string): void {
    this.memoryStore.delete(key);
    this.persist();
  }

  clear(): void {
    this.memoryStore.clear();
    this.persist();
  }

  entries(): IterableIterator<[string, Bucket]> {
    return this.memoryStore.entries();
  }

  size(): number {
    return this.memoryStore.size();
  }

  sweep(now: number): void {
    const beforeSize = this.memoryStore.size();
    this.memoryStore.sweep(now);
    if (this.memoryStore.size() !== beforeSize) {
      this.persist();
    }
  }
}

export class RedisRateLimiterStore implements RateLimiterStore, AsyncRateLimiterStore {
  private url: string;
  private token: string | null;
  private prefix: string;
  private fetchFn: typeof fetch;
  private fallbackStore: RateLimiterStore;

  constructor(options: RedisRateLimiterStoreOptions = {}) {
    this.url =
      options.url ??
      process.env.RATE_LIMIT_REDIS_URL ??
      process.env.REDIS_URL ??
      "http://localhost:6379";
    this.token =
      options.token ??
      process.env.RATE_LIMIT_REDIS_TOKEN ??
      process.env.UPSTASH_REDIS_REST_TOKEN ??
      null;
    this.prefix = options.prefix ?? "handshake:ratelimit:";
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.fallbackStore = options.fallbackStore ?? new MemoryRateLimiterStore();
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private async execCommand(command: (string | number)[]): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const endpoint = this.url.endsWith("/") ? this.url : `${this.url}/`;
    const res = await this.fetchFn(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      throw new Error(`Redis REST request failed with status ${res.status}`);
    }

    const data = (await res.json()) as { result?: unknown; error?: string };
    if (data.error) {
      throw new Error(`Redis REST error: ${data.error}`);
    }
    return data.result;
  }

  // Synchronous RateLimiterStore methods delegating to fallback store
  get(key: string): Bucket | undefined {
    return this.fallbackStore.get(key);
  }

  set(key: string, bucket: Bucket): void {
    this.fallbackStore.set(key, bucket);
    // Non-blocking write-through to Redis
    this.setAsync(key, bucket).catch(() => {});
  }

  delete(key: string): void {
    this.fallbackStore.delete(key);
    this.deleteAsync(key).catch(() => {});
  }

  clear(): void {
    this.fallbackStore.clear();
    this.clearAsync().catch(() => {});
  }

  entries(): IterableIterator<[string, Bucket]> {
    return this.fallbackStore.entries();
  }

  size(): number {
    return this.fallbackStore.size();
  }

  sweep(now: number): void {
    this.fallbackStore.sweep(now);
  }

  // Asynchronous RateLimiterStore methods
  async getAsync(key: string): Promise<Bucket | undefined> {
    try {
      const fullKey = this.getKey(key);
      const raw = await this.execCommand(["GET", fullKey]);
      if (typeof raw === "string" && raw.trim()) {
        const bucket = JSON.parse(raw) as Bucket;
        if (bucket && typeof bucket.count === "number" && typeof bucket.resetAt === "number") {
          this.fallbackStore.set(key, bucket);
          return bucket;
        }
      }
      return this.fallbackStore.get(key);
    } catch {
      return this.fallbackStore.get(key);
    }
  }

  async setAsync(key: string, bucket: Bucket): Promise<void> {
    this.fallbackStore.set(key, bucket);
    try {
      const fullKey = this.getKey(key);
      const ttlSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      await this.execCommand(["SET", fullKey, JSON.stringify(bucket), "EX", ttlSec]);
    } catch {
      // Fallback store already updated
    }
  }

  async deleteAsync(key: string): Promise<void> {
    this.fallbackStore.delete(key);
    try {
      const fullKey = this.getKey(key);
      await this.execCommand(["DEL", fullKey]);
    } catch {
      // Fallback store already updated
    }
  }

  async clearAsync(): Promise<void> {
    this.fallbackStore.clear();
    try {
      await this.execCommand(["FLUSHDB"]);
    } catch {
      // Fallback store already updated
    }
  }

  async consumeAsync(
    key: string,
    max: number,
    windowMs: number,
    now = Date.now(),
  ): Promise<RateLimitResult> {
    try {
      const resetAt = now - (now % windowMs) + windowMs;
      const fullKey = this.getKey(key);
      const ttlSec = Math.max(1, Math.ceil((resetAt - now) / 1000));

      // Atomic increment in Redis REST
      const countRes = await this.execCommand(["INCR", `${fullKey}:count`]);
      const count = typeof countRes === "number" ? countRes : Number(countRes);

      if (count === 1) {
        await this.execCommand(["EXPIRE", `${fullKey}:count`, ttlSec]);
      }

      const bucket: Bucket = { count, resetAt };
      this.fallbackStore.set(key, bucket);

      if (count > max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        };
      }

      return { allowed: true, remaining: max - count };
    } catch {
      return consume(key, max, windowMs, now, this.fallbackStore);
    }
  }
}

function initializeDefaultStore(): RateLimiterStore {
  if (process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL) {
    return new RedisRateLimiterStore();
  }
  if (process.env.RATE_LIMIT_STORE_PATH) {
    return new FileBackedRateLimiterStore();
  }
  return new MemoryRateLimiterStore();
}

let activeStore: RateLimiterStore = initializeDefaultStore();

export function getRateLimiterStore(): RateLimiterStore {
  return activeStore;
}

export function setRateLimiterStore(store: RateLimiterStore): void {
  activeStore = store;
}

export function exportRateLimitState(
  store: RateLimiterStore = activeStore,
): Record<string, Bucket> {
  const result: Record<string, Bucket> = {};
  for (const [key, bucket] of store.entries()) {
    result[key] = { ...bucket };
  }
  return result;
}

export function importRateLimitState(
  state: Record<string, Bucket>,
  store: RateLimiterStore = activeStore,
): void {
  store.clear();
  for (const [key, bucket] of Object.entries(state)) {
    if (bucket && typeof bucket.count === "number" && typeof bucket.resetAt === "number") {
      store.set(key, { ...bucket });
    }
  }
}

export function consume(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
  store: RateLimiterStore = activeStore,
): RateLimitResult {
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    if (store.size() >= MAX_BUCKETS) {
      store.sweep(now);
      if (store.size() >= MAX_BUCKETS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
      }
    }
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, remaining: max - existing.count };
}

export async function consumeAsync(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
  store: RateLimiterStore = activeStore,
): Promise<RateLimitResult> {
  if ("consumeAsync" in store && typeof (store as unknown as AsyncRateLimiterStore).consumeAsync === "function") {
    return (store as unknown as AsyncRateLimiterStore).consumeAsync(key, max, windowMs, now);
  }

  if ("getAsync" in store && typeof (store as unknown as AsyncRateLimiterStore).getAsync === "function") {
    const resetAt = now - (now % windowMs) + windowMs;
    const asyncStore = store as unknown as AsyncRateLimiterStore;
    const existing = await asyncStore.getAsync(key);

    if (!existing || existing.resetAt <= now) {
      const newBucket: Bucket = { count: 1, resetAt };
      await asyncStore.setAsync(key, newBucket);
      return { allowed: true, remaining: max - 1 };
    }

    if (existing.count >= max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    const updatedBucket: Bucket = { count: existing.count + 1, resetAt: existing.resetAt };
    await asyncStore.setAsync(key, updatedBucket);
    return { allowed: true, remaining: max - updatedBucket.count };
  }

  return consume(key, max, windowMs, now, store);
}

/** Test helper only. */
export function resetRateLimits(store: RateLimiterStore = activeStore): void {
  store.clear();
}
