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
  entries(): IterableIterator<[string, Bucket]> | AsyncIterableIterator<[string, Bucket]>;
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
      const state = exportMemoryRateLimitState(this.memoryStore);
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

export class RedisRateLimiterStore implements RateLimiterStore {
  private url: string;
  private token?: string;
  private timeoutMs: number;
  private fallbackStore: RateLimiterStore;

  constructor(opts?: {
    url?: string;
    token?: string;
    timeoutMs?: number;
    fallbackStore?: RateLimiterStore;
  }) {
    this.url =
      opts?.url ??
      process.env.RATE_LIMIT_REDIS_URL ??
      process.env.UPSTASH_REDIS_REST_URL ??
      process.env.REDIS_URL ??
      "";
    this.token =
      opts?.token ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.REDIS_TOKEN ?? undefined;
    this.timeoutMs = opts?.timeoutMs ?? 3000;
    this.fallbackStore = opts?.fallbackStore ?? new MemoryRateLimiterStore();
  }

  getFallbackStore(): RateLimiterStore {
    return this.fallbackStore;
  }

  private async command<T>(cmd: (string | number)[]): Promise<T | null> {
    if (!this.url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify(cmd),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: T };
      return data.result ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async get(key: string): Promise<Bucket | undefined> {
    const raw = await this.command<string>(["GET", key]);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Bucket;
        if (typeof parsed.count === "number" && typeof parsed.resetAt === "number") {
          return parsed;
        }
      } catch {
        // Fall through
      }
    }
    return this.fallbackStore.get(key);
  }

  async set(key: string, bucket: Bucket): Promise<void> {
    const json = JSON.stringify(bucket);
    const ttlMs = Math.max(1, bucket.resetAt - Date.now());
    const res = await this.command<string>(["SET", key, json, "PX", ttlMs]);
    if (!res) {
      this.fallbackStore.set(key, bucket);
    }
  }

  async delete(key: string): Promise<void> {
    await this.command<number>(["DEL", key]);
    this.fallbackStore.delete(key);
  }

  async clear(): Promise<void> {
    await this.command<string>(["FLUSHDB"]);
    this.fallbackStore.clear();
  }

  entries(): AsyncIterableIterator<[string, Bucket]> {
    const fallback = this.fallbackStore;
    return (async function* () {
      for (const entry of fallback.entries() as IterableIterator<[string, Bucket]>) {
        yield entry;
      }
    })();
  }

  async size(): Promise<number> {
    const redisSize = await this.command<number>(["DBSIZE"]);
    if (typeof redisSize === "number") return redisSize;
    return this.fallbackStore.size();
  }

  async sweep(now: number): Promise<void> {
    await this.fallbackStore.sweep(now);
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

function exportMemoryRateLimitState(store: MemoryRateLimiterStore): Record<string, Bucket> {
  const result: Record<string, Bucket> = {};
  for (const [key, bucket] of store.entries()) {
    result[key] = { ...bucket };
  }
  return result;
}

export function exportRateLimitState(
  store: RateLimiterStore = activeStore,
): Record<string, Bucket> {
  if (store instanceof MemoryRateLimiterStore) {
    return exportMemoryRateLimitState(store);
  }
  if (store instanceof FileBackedRateLimiterStore) {
    // FileBackedRateLimiterStore delegates entries to its internal memoryStore
    const result: Record<string, Bucket> = {};
    for (const [key, bucket] of store.entries() as IterableIterator<[string, Bucket]>) {
      result[key] = { ...bucket };
    }
    return result;
  }
  return {};
}

export async function exportRateLimitStateAsync(
  store: RateLimiterStore = activeStore,
): Promise<Record<string, Bucket>> {
  const result: Record<string, Bucket> = {};
  const entriesIter = store.entries();
  if (Symbol.asyncIterator in entriesIter) {
    for await (const [key, bucket] of entriesIter as AsyncIterableIterator<[string, Bucket]>) {
      result[key] = { ...bucket };
    }
  } else if (Symbol.iterator in entriesIter) {
    for (const [key, bucket] of entriesIter as IterableIterator<[string, Bucket]>) {
      result[key] = { ...bucket };
    }
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
  if (store instanceof RedisRateLimiterStore) {
    return consume(key, max, windowMs, now, store.getFallbackStore());
  }

  // Windows are aligned to wall-clock multiples of windowMs, like the TOTP windows.
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = store.get(key);
  if (existing && typeof (existing as Promise<unknown>).then === "function") {
    throw new Error("Store returned a Promise; use consumeAsync instead of consume.");
  }
  const syncExisting = existing as Bucket | undefined;

  if (!syncExisting || syncExisting.resetAt <= now) {
    const sizeVal = store.size();
    const syncSize = typeof sizeVal === "number" ? sizeVal : 0;
    if (syncSize >= MAX_BUCKETS) {
      store.sweep(now);
      const postSizeVal = store.size();
      const syncPostSize = typeof postSizeVal === "number" ? postSizeVal : 0;
      // Still full of live buckets: refuse rather than grow without bound.
      if (syncPostSize >= MAX_BUCKETS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
      }
    }
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1 };
  }

  if (syncExisting.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((syncExisting.resetAt - now) / 1000)),
    };
  }
  syncExisting.count += 1;
  store.set(key, syncExisting);
  return { allowed: true, remaining: max - syncExisting.count };
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
    const currentSize = await store.size();
    if (currentSize >= MAX_BUCKETS) {
      await store.sweep(now);
      const newSize = await store.size();
      if (newSize >= MAX_BUCKETS) {
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
