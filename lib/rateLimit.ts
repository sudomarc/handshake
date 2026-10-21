/**
 * Fixed-window rate limiter with pluggable store support and file-backed persistence.
 *
 * Supports in-memory storage (default) and file-backed atomic persistence configured via
 * constructor parameter or `RATE_LIMIT_STORE_PATH` environment variable.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Bucket = { count: number; resetAt: number };

export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

export interface RateLimiterStore {
  get(key: string): Bucket | undefined | Promise<Bucket | undefined>;
  set(key: string, bucket: Bucket): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
  entries(): IterableIterator<[string, Bucket]> | Promise<IterableIterator<[string, Bucket]>>;
  size(): number | Promise<number>;
  sweep(now: number): void | Promise<void>;
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

export class RedisRateLimiterStore implements RateLimiterStore {
  private url: string;
  private token: string | null;
  private fallbackStore = new MemoryRateLimiterStore();

  constructor(options?: { url?: string; token?: string }) {
    const rawUrl =
      options?.url ??
      process.env.RATE_LIMIT_REDIS_URL ??
      process.env.UPSTASH_REDIS_REST_URL ??
      process.env.REDIS_URL ??
      "";
    this.token = options?.token ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;
    this.url = rawUrl.replace(/\/$/, "");
  }

  private isConfigured(): boolean {
    return Boolean(this.url);
  }

  private async fetchRedis(command: string[]): Promise<unknown> {
    if (!this.isConfigured()) return null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: unknown; error?: unknown };
      return data.result ?? null;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<Bucket | undefined> {
    if (!this.isConfigured()) {
      return this.fallbackStore.get(key);
    }
    const raw = await this.fetchRedis(["GET", `ratelimit:${key}`]);
    if (!raw || typeof raw !== "string") {
      return this.fallbackStore.get(key);
    }
    try {
      const parsed = JSON.parse(raw) as Bucket;
      if (typeof parsed.count === "number" && typeof parsed.resetAt === "number") {
        return parsed;
      }
    } catch {
      // Fallback on JSON parse error
    }
    return this.fallbackStore.get(key);
  }

  async set(key: string, bucket: Bucket): Promise<void> {
    this.fallbackStore.set(key, bucket);
    if (!this.isConfigured()) return;

    const ttlMs = Math.max(1000, bucket.resetAt - Date.now());
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    const jsonStr = JSON.stringify(bucket);
    await this.fetchRedis(["SETEX", `ratelimit:${key}`, String(ttlSeconds), jsonStr]);
  }

  async delete(key: string): Promise<void> {
    this.fallbackStore.delete(key);
    if (!this.isConfigured()) return;
    await this.fetchRedis(["DEL", `ratelimit:${key}`]);
  }

  async clear(): Promise<void> {
    this.fallbackStore.clear();
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

function createDefaultStore(): RateLimiterStore {
  if (
    process.env.RATE_LIMIT_REDIS_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL
  ) {
    return new RedisRateLimiterStore();
  }
  if (process.env.RATE_LIMIT_STORE_PATH) {
    return new FileBackedRateLimiterStore();
  }
  return new MemoryRateLimiterStore();
}

let activeStore: RateLimiterStore = createDefaultStore();

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
  // Windows are aligned to wall-clock multiples of windowMs, like the TOTP windows.
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = store.get(key);
  if (existing instanceof Promise) {
    throw new Error("Store returned a Promise; use consumeAsync for async rate limiters.");
  }

  if (!existing || existing.resetAt <= now) {
    const sz = store.size();
    if (typeof sz === "number" && sz >= MAX_BUCKETS) {
      store.sweep(now);
      const szAfter = store.size();
      // Still full of live buckets: refuse rather than grow without bound.
      if (typeof szAfter === "number" && szAfter >= MAX_BUCKETS) {
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
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = await store.get(key);

  if (!existing || existing.resetAt <= now) {
    const sz = await store.size();
    if (sz >= MAX_BUCKETS) {
      await store.sweep(now);
      const szAfter = await store.size();
      if (szAfter >= MAX_BUCKETS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
      }
    }
    await store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  await store.set(key, existing);
  return { allowed: true, remaining: max - existing.count };
}

/** Test helper only. */
export function resetRateLimits(store: RateLimiterStore = activeStore): void {
  store.clear();
}
