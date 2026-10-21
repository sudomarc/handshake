/**
 * Fixed-window rate limiter with pluggable store support, file-backed persistence,
 * and distributed Redis REST store adapter.
 *
 * Supports in-memory storage (default), file-backed atomic persistence configured via
 * constructor parameter or `RATE_LIMIT_STORE_PATH` environment variable, and distributed
 * Redis REST storage via `RATE_LIMIT_REDIS_URL` or `REDIS_URL` environment variables.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Bucket = { count: number; resetAt: number };

export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

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
  get(key: string): Promise<Bucket | undefined> | Bucket | undefined;
  set(key: string, bucket: Bucket): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
  entries():
    | Promise<IterableIterator<[string, Bucket]> | [string, Bucket][]>
    | IterableIterator<[string, Bucket]>;
  size(): Promise<number> | number;
  sweep(now: number): Promise<void> | void;
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

export interface RedisRateLimiterStoreOptions {
  url?: string;
  token?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class RedisRateLimiterStore implements AsyncRateLimiterStore {
  private url: string | null;
  private token: string | null;
  private fetchFn: typeof fetch;
  private timeoutMs: number;
  private memoryFallback = new MemoryRateLimiterStore();

  constructor(options?: RedisRateLimiterStoreOptions) {
    this.url = options?.url ?? process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? null;
    this.token =
      options?.token ?? process.env.RATE_LIMIT_REDIS_TOKEN ?? process.env.REDIS_TOKEN ?? null;
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
    this.timeoutMs = options?.timeoutMs ?? 3000;
  }

  private async request(path: string, method = "GET", body?: unknown): Promise<unknown> {
    if (!this.url) {
      throw new Error("Redis URL is not configured");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const targetUrl = new URL(path, this.url).toString();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const res = await this.fetchFn(targetUrl, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = (await res.json()) as { result?: unknown };
      return data?.result !== undefined ? data.result : data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get(key: string): Promise<Bucket | undefined> {
    if (!this.url) return this.memoryFallback.get(key);
    try {
      const res = await this.request(`/get/${encodeURIComponent(key)}`);
      if (typeof res === "string") {
        const parsed = JSON.parse(res) as Bucket;
        if (parsed && typeof parsed.count === "number" && typeof parsed.resetAt === "number") {
          this.memoryFallback.set(key, parsed);
          return parsed;
        }
      } else if (res && typeof res === "object" && "count" in res && "resetAt" in res) {
        const bucket = res as Bucket;
        this.memoryFallback.set(key, bucket);
        return bucket;
      }
      return undefined;
    } catch {
      return this.memoryFallback.get(key);
    }
  }

  async set(key: string, bucket: Bucket): Promise<void> {
    this.memoryFallback.set(key, bucket);
    if (!this.url) return;
    try {
      const ttlSeconds = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      await this.request(
        `/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(bucket))}?EX=${ttlSeconds}`,
        "POST",
      );
    } catch {
      // Best effort fallback
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryFallback.delete(key);
    if (!this.url) return;
    try {
      await this.request(`/del/${encodeURIComponent(key)}`, "POST");
    } catch {
      // Best effort fallback
    }
  }

  async clear(): Promise<void> {
    this.memoryFallback.clear();
    if (!this.url) return;
    try {
      await this.request("/flushdb", "POST");
    } catch {
      // Best effort fallback
    }
  }

  async entries(): Promise<[string, Bucket][]> {
    return Array.from(this.memoryFallback.entries());
  }

  async size(): Promise<number> {
    return this.memoryFallback.size();
  }

  async sweep(now: number): Promise<void> {
    this.memoryFallback.sweep(now);
  }
}

function createDefaultStore(): RateLimiterStore | AsyncRateLimiterStore {
  if (process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL) {
    return new RedisRateLimiterStore();
  }
  if (process.env.RATE_LIMIT_STORE_PATH) {
    return new FileBackedRateLimiterStore();
  }
  return new MemoryRateLimiterStore();
}

let activeStore: RateLimiterStore | AsyncRateLimiterStore = createDefaultStore();

export function getRateLimiterStore(): RateLimiterStore | AsyncRateLimiterStore {
  return activeStore;
}

export function setRateLimiterStore(store: RateLimiterStore | AsyncRateLimiterStore): void {
  activeStore = store;
}

export function exportRateLimitState(
  store: RateLimiterStore | AsyncRateLimiterStore = activeStore,
): Record<string, Bucket> {
  const result: Record<string, Bucket> = {};
  if ("entries" in store && typeof store.entries === "function") {
    const entries = store.entries();
    if (
      entries &&
      typeof (entries as IterableIterator<[string, Bucket]>)[Symbol.iterator] === "function"
    ) {
      for (const [key, bucket] of entries as IterableIterator<[string, Bucket]>) {
        result[key] = { ...bucket };
      }
    }
  }
  return result;
}

export function importRateLimitState(
  state: Record<string, Bucket>,
  store: RateLimiterStore | AsyncRateLimiterStore = activeStore,
): void {
  if ("clear" in store) store.clear();
  for (const [key, bucket] of Object.entries(state)) {
    if (bucket && typeof bucket.count === "number" && typeof bucket.resetAt === "number") {
      if ("set" in store) store.set(key, { ...bucket });
    }
  }
}

export function consume(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
  store: RateLimiterStore | AsyncRateLimiterStore = activeStore,
): RateLimitResult {
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = store.get(key) as Bucket | undefined;

  const currentSize = (store.size() as number) ?? 0;

  if (!existing || existing.resetAt <= now) {
    if (currentSize >= MAX_BUCKETS) {
      store.sweep(now);
      const newSize = (store.size() as number) ?? 0;
      if (newSize >= MAX_BUCKETS) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
        };
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
  store: RateLimiterStore | AsyncRateLimiterStore = activeStore,
): Promise<RateLimitResult> {
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = await store.get(key);

  const currentSize = await store.size();

  if (!existing || existing.resetAt <= now) {
    if (currentSize >= MAX_BUCKETS) {
      await store.sweep(now);
      const newSize = await store.size();
      if (newSize >= MAX_BUCKETS) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
        };
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
  const updated = { ...existing, count: existing.count + 1 };
  await store.set(key, updated);
  return { allowed: true, remaining: max - updated.count };
}

/** Test helper only. */
export function resetRateLimits(
  store: RateLimiterStore | AsyncRateLimiterStore = activeStore,
): void {
  if ("clear" in store) {
    store.clear();
  }
}
