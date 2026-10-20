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
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
  delete(key: string): void;
  clear(): void;
  entries(): IterableIterator<[string, Bucket]>;
  size(): number;
  sweep(now: number): void;
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

let activeStore: RateLimiterStore = process.env.RATE_LIMIT_STORE_PATH
  ? new FileBackedRateLimiterStore()
  : new MemoryRateLimiterStore();

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

  if (!existing || existing.resetAt <= now) {
    if (store.size() >= MAX_BUCKETS) {
      store.sweep(now);
      // Still full of live buckets: refuse rather than grow without bound.
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

/** Test helper only. */
export function resetRateLimits(store: RateLimiterStore = activeStore): void {
  store.clear();
}
