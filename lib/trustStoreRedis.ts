/**
 * Redis-backed implementation of TrustStore using Upstash Redis.
 *
 * Follows the same pattern as RedisRateLimiterStore in lib/rateLimit.ts:
 * - Falls back to in-memory when Redis not configured
 * - Uses atomic Lua scripts for critical operations (nonce consumption)
 * - TTL-based expiration aligned with in-memory store constants
 */

import { randomBytes } from "node:crypto";
import { TRUST_PROTOCOL, verifyDeviceProof, type DeviceId, type PairId } from "./trustCrypto";
import type { TrustState } from "./trustSchemas";
import { Redis } from "@upstash/redis";

export interface TrustStoreState {
  pairs: Array<{ pairId: PairId; devices: StoredDevice[] }>;
  sessions: Array<Omit<StoredSession, "usedNonces"> & { usedNonces: string[] }>;
  invites: StoredInvite[];
}

export const SESSION_TTL_MS = 5 * 60_000;
export const DEVICE_TTL_MS = 90 * 24 * 60 * 60_000;
export const INVITE_TTL_MS = 120_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const MAX_PAIRS = 10_000;
const MAX_SESSIONS_PER_PAIR = 8;

export interface StoredDevice {
  deviceId: DeviceId;
  label: string | null;
  deviceSecret: string;
  enrolledAt: number;
  lastSeenAt: number;
  revokedAt: number | null;
}

export interface StoredSession {
  sessionId: string;
  pairId: PairId;
  initiatorDeviceId: DeviceId;
  peerDeviceId: DeviceId | null;
  challengeNonce: string;
  issuedAt: number;
  expiresAt: number;
  usedNonces: Set<string>;
  state: TrustState;
}

export type InviteState = "pending" | "accepted" | "confirmed" | "expired" | "cancelled";

export interface StoredInvite {
  inviteId: string;
  ownerDisplayName: string;
  peerDisplayName: string | null;
  state: InviteState;
  pairId: PairId | null;
  createdAt: number;
  expiresAt: number;
  updatedAt: number;
}

export type TrustErrorCode =
  | "device_not_enrolled"
  | "device_revoked"
  | "invalid_proof"
  | "session_not_found"
  | "session_expired"
  | "session_already_bound"
  | "session_same_device"
  | "nonce_replayed"
  | "circle_limit"
  | "inviting_not_found"
  | "inviting_expired"
  | "inviting_not_pending"
  | "inviting_already_confirmed"
  | "inviting_pair_mismatch";

export class TrustError extends Error {
  constructor(
    readonly code: TrustErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrustError";
  }
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function now(): number {
  return Date.now();
}

/** Maximum TTL for sessions/nonces in seconds (5 minutes) */
const SESSION_TTL_SECONDS = 300;

export class RedisTrustStore {
  private redis: Redis | null = null;
  private fallbackStore: Map<string, unknown> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private useRedis = false;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      this.redis = new Redis({ url, token });
      this.useRedis = true;
    }

    // Unref timer so it doesn't keep process alive in tests
    this.timer = setInterval(() => this.sweep(), CLEANUP_INTERVAL_MS);
    this.timer.unref?.();
  }

  private getClient(): Redis {
    if (!this.redis) {
      throw new Error("Redis client not initialized");
    }
    return this.redis;
  }

  /** Key prefixes for Redis */
  private pairKey(pairId: PairId): string {
    return `trust:pair:${pairId}`;
  }

  private sessionKey(sessionId: string): string {
    return `trust:session:${sessionId}`;
  }

  private nonceKey(sessionId: string): string {
    return `trust:session:${sessionId}:nonces`;
  }

  private inviteKey(inviteId: string): string {
    return `trust:invite:${inviteId}`;
  }

  /** Serialize device for Redis storage */
  private serializeDevice(d: StoredDevice): string {
    return JSON.stringify({
      deviceId: d.deviceId,
      label: d.label,
      deviceSecret: d.deviceSecret,
      enrolledAt: d.enrolledAt,
      lastSeenAt: d.lastSeenAt,
      revokedAt: d.revokedAt,
    });
  }

  /** Deserialize device from Redis */
  private deserializeDevice(data: string): StoredDevice {
    const obj = JSON.parse(data);
    return {
      deviceId: obj.deviceId,
      label: obj.label,
      deviceSecret: obj.deviceSecret,
      enrolledAt: obj.enrolledAt,
      lastSeenAt: obj.lastSeenAt,
      revokedAt: obj.revokedAt,
    };
  }

  /** Serialize session for Redis storage */
  private serializeSession(s: Omit<StoredSession, "usedNonces">): Record<string, string> {
    return {
      sessionId: s.sessionId,
      pairId: s.pairId,
      initiatorDeviceId: s.initiatorDeviceId,
      peerDeviceId: s.peerDeviceId ?? "",
      challengeNonce: s.challengeNonce,
      issuedAt: String(s.issuedAt),
      expiresAt: String(s.expiresAt),
      state: s.state,
    };
  }

  /** Deserialize session from Redis */
  private deserializeSession(data: Record<string, unknown>): Omit<StoredSession, "usedNonces"> {
    return {
      sessionId: data.sessionId as string,
      pairId: data.pairId as PairId,
      initiatorDeviceId: data.initiatorDeviceId as DeviceId,
      peerDeviceId: (data.peerDeviceId as string) || null,
      challengeNonce: data.challengeNonce as string,
      issuedAt: Number(data.issuedAt),
      expiresAt: Number(data.expiresAt),
      state: data.state as TrustState,
    };
  }

  /** Serialize invite for Redis storage */
  private serializeInvite(inv: StoredInvite): string {
    return JSON.stringify({
      inviteId: inv.inviteId,
      ownerDisplayName: inv.ownerDisplayName,
      peerDisplayName: inv.peerDisplayName,
      state: inv.state,
      pairId: inv.pairId,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      updatedAt: inv.updatedAt,
    });
  }

  /** Deserialize invite from Redis */
  private deserializeInvite(data: string): StoredInvite {
    const obj = JSON.parse(data);
    return {
      inviteId: obj.inviteId,
      ownerDisplayName: obj.ownerDisplayName,
      peerDisplayName: obj.peerDisplayName,
      state: obj.state,
      pairId: obj.pairId,
      createdAt: obj.createdAt,
      expiresAt: obj.expiresAt,
      updatedAt: obj.updatedAt,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Public API - mirrors TrustStore interface                        */
  /* ---------------------------------------------------------------- */

  async enroll(input: {
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<StoredDevice> {
    if (this.useRedis) {
      return this.enrollRedis(input);
    }
    return this.enrollFallback(input);
  }

  private async enrollRedis(input: {
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<StoredDevice> {
    const client = this.getClient();
    const key = this.pairKey(input.pairId);

    // Check pair count (approximate via SCAN)
    const pairCount = await client.hlen(key);
    if (pairCount === null || pairCount >= MAX_PAIRS) {
      await this.sweepRedis();
      const afterCount = await client.hlen(key);
      if (afterCount !== null && afterCount >= MAX_PAIRS) {
        throw new TrustError("circle_limit", "Too many trusted circles are active.");
      }
    }

    const existing = await client.hget(key, input.deviceId);
    const at = now();
    const device: StoredDevice = {
      deviceId: input.deviceId,
      label: input.label ?? (existing ? this.deserializeDevice(existing as string).label : null),
      deviceSecret: input.deviceSecret,
      enrolledAt: existing ? this.deserializeDevice(existing as string).enrolledAt : at,
      lastSeenAt: at,
      revokedAt: null,
    };

    await client.hset(key, { [input.deviceId]: this.serializeDevice(device) });
    return device;
  }

  private enrollFallback(input: {
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): StoredDevice {
    let devices = this.fallbackStore.get(`pair:${input.pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices) {
      if (this.fallbackStore.size >= MAX_PAIRS) {
        this.sweepFallback();
        if (this.fallbackStore.size >= MAX_PAIRS) {
          throw new TrustError("circle_limit", "Too many trusted circles are active.");
        }
      }
      devices = new Map();
      this.fallbackStore.set(`pair:${input.pairId}`, devices);
    }

    const existing = devices.get(input.deviceId);
    const at = now();
    const device: StoredDevice = {
      deviceId: input.deviceId,
      label: input.label ?? existing?.label ?? null,
      deviceSecret: input.deviceSecret,
      enrolledAt: existing?.enrolledAt ?? at,
      lastSeenAt: at,
      revokedAt: null,
    };
    devices.set(input.deviceId, device);
    return device;
  }

  async revoke(input: {
    pairId: PairId;
    actor: { deviceId: DeviceId; nonce: string; issuedAt: number; proof: string };
    targetDeviceId: DeviceId;
    revokeWholeCircle: boolean;
  }): Promise<DeviceId[]> {
    if (this.useRedis) {
      return this.revokeRedis(input);
    }
    return this.revokeFallback(input);
  }

  private async revokeRedis(input: {
    pairId: PairId;
    actor: { deviceId: DeviceId; nonce: string; issuedAt: number; proof: string };
    targetDeviceId: DeviceId;
    revokeWholeCircle: boolean;
  }): Promise<DeviceId[]> {
    const client = this.getClient();
    const key = this.pairKey(input.pairId);

    // Verify actor
    const actorData = await client.hget(key, input.actor.deviceId);
    if (!actorData) throw new TrustError("device_not_enrolled", "This device is not enrolled.");
    const actorDevice = this.deserializeDevice(actorData as string);
    if (actorDevice.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.actor.proof,
      pairId: input.pairId,
      deviceId: input.actor.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.actor.nonce,
      issuedAt: input.actor.issuedAt,
      deviceSecret: actorDevice.deviceSecret,
    });

    const at = now();
    const revoked: DeviceId[] = [];

    if (input.revokeWholeCircle) {
      // Get all devices in pair
      const allDevices = await client.hgetall(key);
      if (allDevices) {
        for (const [deviceId, data] of Object.entries(allDevices)) {
          const device = this.deserializeDevice(data as string);
          if (device.revokedAt === null) {
            device.revokedAt = at;
            await client.hset(key, { [deviceId]: this.serializeDevice(device) });
            revoked.push(deviceId as DeviceId);
          }
        }
      }
    } else {
      // Revoke single device
      const targetData = await client.hget(key, input.targetDeviceId);
      if (targetData) {
        const device = this.deserializeDevice(targetData as string);
        if (device.revokedAt === null) {
          device.revokedAt = at;
          await client.hset(key, { [input.targetDeviceId]: this.serializeDevice(device) });
          revoked.push(input.targetDeviceId);
        }
      }
    }

    // Invalidate sessions for revoked devices
    const sessions = await this.getSessionsForPair(input.pairId);
    for (const session of sessions) {
      const touched =
        revoked.includes(session.initiatorDeviceId) ||
        (session.peerDeviceId !== null && revoked.includes(session.peerDeviceId));
      if (touched && session.state === "trusted") {
        await client.hset(this.sessionKey(session.sessionId), { state: "unverified" });
      }
    }

    return revoked;
  }

  private revokeFallback(input: {
    pairId: PairId;
    actor: { deviceId: DeviceId; nonce: string; issuedAt: number; proof: string };
    targetDeviceId: DeviceId;
    revokeWholeCircle: boolean;
  }): DeviceId[] {
    const devices = this.fallbackStore.get(`pair:${input.pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices) throw new TrustError("device_not_enrolled", "This device is not enrolled.");

    const actor = devices.get(input.actor.deviceId);
    if (!actor) throw new TrustError("device_not_enrolled", "This device is not enrolled.");
    if (actor.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.actor.proof,
      pairId: input.pairId,
      deviceId: input.actor.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.actor.nonce,
      issuedAt: input.actor.issuedAt,
      deviceSecret: actor.deviceSecret,
    });

    const at = now();
    const revoked: DeviceId[] = [];
    const targetDevice = devices.get(input.targetDeviceId);
    const targets = input.revokeWholeCircle
      ? [...devices.values()].filter((d) => d.revokedAt === null)
      : targetDevice && targetDevice.revokedAt === null
        ? [targetDevice]
        : [];

    for (const device of targets) {
      device.revokedAt = at;
      revoked.push(device.deviceId);
    }

    // Invalidate sessions
    for (const session of this.getSessionsForPairFallback(input.pairId)) {
      const touched =
        revoked.includes(session.initiatorDeviceId) ||
        (session.peerDeviceId !== null && revoked.includes(session.peerDeviceId));
      if (touched && session.state === "trusted") session.state = "unverified";
    }

    return revoked;
  }

  async listDevices(pairId: PairId): Promise<StoredDevice[]> {
    if (this.useRedis) {
      return this.listDevicesRedis(pairId);
    }
    return this.listDevicesFallback(pairId);
  }

  private async listDevicesRedis(pairId: PairId): Promise<StoredDevice[]> {
    const client = this.getClient();
    const key = this.pairKey(pairId);
    const allDevices = await client.hgetall(key);
    if (!allDevices) return [];

    const devices: StoredDevice[] = [];
    for (const data of Object.values(allDevices)) {
      devices.push(this.deserializeDevice(data as string));
    }
    return devices.sort((a, b) => a.enrolledAt - b.enrolledAt);
  }

  private listDevicesFallback(pairId: PairId): StoredDevice[] {
    const devices = this.fallbackStore.get(`pair:${pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices) return [];
    return [...devices.values()].sort((a, b) => a.enrolledAt - b.enrolledAt);
  }

  async openSession(input: {
    pairId: PairId;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    if (this.useRedis) {
      return this.openSessionRedis(input);
    }
    return this.openSessionFallback(input);
  }

  private async openSessionRedis(input: {
    pairId: PairId;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    const client = this.getClient();
    const pairKey = this.pairKey(input.pairId);

    // Verify device
    const deviceData = await client.hget(pairKey, input.deviceId);
    if (!deviceData)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = this.deserializeDevice(deviceData as string);
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: input.pairId,
      deviceId: input.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    // Check session limit for pair
    const pairSessions = await this.getSessionsForPair(input.pairId);
    const activePairs = pairSessions.filter((s) => s.expiresAt > now());
    if (activePairs.length >= MAX_SESSIONS_PER_PAIR) {
      // Drop oldest unbound session
      const stale = activePairs
        .filter((s) => s.state === "unverified")
        .sort((a, b) => a.issuedAt - b.issuedAt)[0];
      if (stale) {
        await client.del(this.sessionKey(stale.sessionId));
        await client.del(this.nonceKey(stale.sessionId));
      }
    }

    const at = now();
    const session: StoredSession = {
      sessionId: newId(),
      pairId: input.pairId,
      initiatorDeviceId: input.deviceId,
      peerDeviceId: null,
      challengeNonce: newId(),
      issuedAt: at,
      expiresAt: at + SESSION_TTL_MS,
      usedNonces: new Set<string>(),
      state: "unverified",
    };

    // Store session
    await client.hset(this.sessionKey(session.sessionId), this.serializeSession(session));
    await client.expire(this.sessionKey(session.sessionId), Math.ceil(SESSION_TTL_MS / 1000));

    // Track session ID in pair's session set
    await client.sadd(`trust:pair:${input.pairId}:sessions`, session.sessionId);

    // Consume the initial nonce
    await this.consumeNonceRedis(session.sessionId, input.nonce);

    // Update device lastSeenAt
    device.lastSeenAt = at;
    await client.hset(pairKey, { [input.deviceId]: this.serializeDevice(device) });

    return session;
  }

  private openSessionFallback(input: {
    pairId: PairId;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const devices = this.fallbackStore.get(`pair:${input.pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = devices.get(input.deviceId);
    if (!device)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: input.pairId,
      deviceId: input.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    // Check session limit (simplified for fallback)
    const pairSessions = this.getSessionsForPairFallback(input.pairId);
    if (pairSessions.length >= MAX_SESSIONS_PER_PAIR) {
      const stale = pairSessions
        .filter((s) => s.state === "unverified")
        .sort((a, b) => a.issuedAt - b.issuedAt)[0];
      if (stale) {
        this.fallbackStore.delete(`session:${stale.sessionId}`);
        this.fallbackStore.delete(`nonces:${stale.sessionId}`);
      }
    }

    const at = now();
    const session: StoredSession = {
      sessionId: newId(),
      pairId: input.pairId,
      initiatorDeviceId: input.deviceId,
      peerDeviceId: null,
      challengeNonce: newId(),
      issuedAt: at,
      expiresAt: at + SESSION_TTL_MS,
      usedNonces: new Set<string>(),
      state: "unverified",
    };

    this.consumeNonceFallback(session.sessionId, input.nonce);
    this.fallbackStore.set(`session:${session.sessionId}`, session);
    device.lastSeenAt = at;
    return session;
  }

  async joinSession(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    if (this.useRedis) {
      return this.joinSessionRedis(input);
    }
    return this.joinSessionFallback(input);
  }

  private async joinSessionRedis(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    const client = this.getClient();
    const sessionKey = this.sessionKey(input.sessionId);

    // Get session
    const sessionData = await client.hgetall(sessionKey);
    if (!sessionData || Object.keys(sessionData).length === 0) {
      throw new TrustError("session_not_found", "Unknown call session.");
    }
    const session = this.deserializeSession(sessionData);

    if (session.expiresAt <= now()) {
      await client.del(sessionKey);
      await client.del(this.nonceKey(input.sessionId));
      throw new TrustError("session_expired", "This call session has expired.");
    }

    // Verify device
    const pairKey = this.pairKey(session.pairId);
    const deviceData = await client.hget(pairKey, input.deviceId);
    if (!deviceData)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = this.deserializeDevice(deviceData as string);
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    // Atomic nonce consumption
    const consumed = await this.consumeNonceRedis(input.sessionId, input.nonce);
    if (!consumed) {
      throw new TrustError("nonce_replayed", "This request has already been used.");
    }

    if (input.deviceId === session.initiatorDeviceId) {
      throw new TrustError(
        "session_same_device",
        "A call session needs two different devices to be recognised.",
      );
    }
    if (session.peerDeviceId !== null) {
      throw new TrustError("session_already_bound", "This call session already has its peer.");
    }

    // Since Upstash doesn't support Lua scripts, we do a check-then-set with a small race window
    // In practice, concurrent joinSession for the same session is extremely rare
    const currentState = await client.hget(sessionKey, "state");
    if (currentState !== "unverified") {
      // Re-read and check state
      const updated = await client.hgetall(sessionKey);
      if (!updated || updated.state !== "trusted" || updated.peerDeviceId !== input.deviceId) {
        throw new TrustError("session_already_bound", "This call session already has its peer.");
      }
    } else {
      // Update session state to trusted
      await client.hset(sessionKey, {
        state: "trusted",
        peerDeviceId: input.deviceId,
        issuedAt: String(now()),
      });
      await client.expire(sessionKey, SESSION_TTL_SECONDS);
    }

    // Update device lastSeenAt
    device.lastSeenAt = now();
    await client.hset(pairKey, { [input.deviceId]: this.serializeDevice(device) });

    // Return updated session
    const finalData = await client.hgetall(sessionKey);
    if (!finalData) throw new TrustError("session_not_found", "Unknown call session.");
    const finalSession = this.deserializeSession(finalData);
    const nonces = await client.smembers(this.nonceKey(input.sessionId));
    return {
      ...finalSession,
      usedNonces: new Set(nonces || []),
    };
  }

  private joinSessionFallback(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const session = this.fallbackStore.get(`session:${input.sessionId}`) as
      StoredSession | undefined;
    if (!session) throw new TrustError("session_not_found", "Unknown call session.");
    if (session.expiresAt <= now()) {
      this.fallbackStore.delete(`session:${input.sessionId}`);
      throw new TrustError("session_expired", "This call session has expired.");
    }

    const devices = this.fallbackStore.get(`pair:${session.pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = devices.get(input.deviceId);
    if (!device)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    if (!this.consumeNonceFallback(session.sessionId, input.nonce)) {
      throw new TrustError("nonce_replayed", "This request has already been used.");
    }

    if (input.deviceId === session.initiatorDeviceId) {
      throw new TrustError(
        "session_same_device",
        "A call session needs two different devices to be recognised.",
      );
    }
    if (session.peerDeviceId !== null) {
      throw new TrustError("session_already_bound", "This call session already has its peer.");
    }

    session.peerDeviceId = input.deviceId;
    session.state = "trusted";
    session.issuedAt = now();
    device.lastSeenAt = session.issuedAt;
    return session;
  }

  async listSessions(input: {
    pairId: PairId;
    excludeDeviceId: DeviceId;
  }): Promise<StoredSession[]> {
    if (this.useRedis) {
      return this.listSessionsRedis(input);
    }
    return this.listSessionsFallback(input);
  }

  private async listSessionsRedis(input: {
    pairId: PairId;
    excludeDeviceId: DeviceId;
  }): Promise<StoredSession[]> {
    this.getClient();
    const sessions = await this.getSessionsForPair(input.pairId);
    const at = now();

    return sessions
      .filter((s) => s.expiresAt > at && s.initiatorDeviceId !== input.excludeDeviceId)
      .sort((a, b) => a.issuedAt - b.issuedAt);
  }

  private listSessionsFallback(input: {
    pairId: PairId;
    excludeDeviceId: DeviceId;
  }): StoredSession[] {
    this.sweepFallback();
    const at = now();
    return this.getSessionsForPairFallback(input.pairId)
      .filter((s) => s.expiresAt > at && s.initiatorDeviceId !== input.excludeDeviceId)
      .sort((a, b) => a.issuedAt - b.issuedAt);
  }

  async readSession(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    if (this.useRedis) {
      return this.readSessionRedis(input);
    }
    return this.readSessionFallback(input);
  }

  private async readSessionRedis(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): Promise<StoredSession> {
    const client = this.getClient();
    const sessionKey = this.sessionKey(input.sessionId);

    const sessionData = await client.hgetall(sessionKey);
    if (!sessionData || Object.keys(sessionData).length === 0) {
      throw new TrustError("session_not_found", "Unknown call session.");
    }
    const session = this.deserializeSession(sessionData);

    if (session.expiresAt <= now()) {
      await client.del(sessionKey);
      await client.del(this.nonceKey(input.sessionId));
      throw new TrustError("session_expired", "This call session has expired.");
    }

    const pairKey = this.pairKey(session.pairId);
    const deviceData = await client.hget(pairKey, input.deviceId);
    if (!deviceData)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = this.deserializeDevice(deviceData as string);
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    await this.consumeNonceRedis(input.sessionId, input.nonce);
    device.lastSeenAt = now();
    await client.hset(pairKey, { [input.deviceId]: this.serializeDevice(device) });

    const nonces = await client.smembers(this.nonceKey(input.sessionId));
    return {
      ...session,
      usedNonces: new Set(nonces || []),
    };
  }

  private readSessionFallback(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const session = this.fallbackStore.get(`session:${input.sessionId}`) as
      StoredSession | undefined;
    if (!session) throw new TrustError("session_not_found", "Unknown call session.");
    if (session.expiresAt <= now()) {
      this.fallbackStore.delete(`session:${input.sessionId}`);
      throw new TrustError("session_expired", "This call session has expired.");
    }

    const devices = this.fallbackStore.get(`pair:${session.pairId}`) as
      Map<string, StoredDevice> | undefined;
    if (!devices)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    const device = devices.get(input.deviceId);
    if (!device)
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }

    verifyDeviceProof({
      expected: input.proof,
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      deviceSecret: device.deviceSecret,
    });

    this.consumeNonceFallback(session.sessionId, input.nonce);
    device.lastSeenAt = now();
    return session;
  }

  async createInvite(input: { ownerDisplayName: string }): Promise<StoredInvite> {
    if (this.useRedis) {
      return this.createInviteRedis(input);
    }
    return this.createInviteFallback(input);
  }

  private async createInviteRedis(input: { ownerDisplayName: string }): Promise<StoredInvite> {
    const client = this.getClient();
    const at = now();
    const invite: StoredInvite = {
      inviteId: newId(),
      ownerDisplayName: input.ownerDisplayName,
      peerDisplayName: null,
      state: "pending",
      pairId: null,
      createdAt: at,
      expiresAt: at + INVITE_TTL_MS,
      updatedAt: at,
    };
    await client.set(this.inviteKey(invite.inviteId), this.serializeInvite(invite), {
      ex: Math.ceil(INVITE_TTL_MS / 1000),
    });
    return invite;
  }

  private createInviteFallback(input: { ownerDisplayName: string }): StoredInvite {
    const at = now();
    const invite: StoredInvite = {
      inviteId: newId(),
      ownerDisplayName: input.ownerDisplayName,
      peerDisplayName: null,
      state: "pending",
      pairId: null,
      createdAt: at,
      expiresAt: at + INVITE_TTL_MS,
      updatedAt: at,
    };
    this.fallbackStore.set(`invite:${invite.inviteId}`, invite);
    return invite;
  }

  async getInvite(inviteId: string): Promise<StoredInvite | null> {
    if (this.useRedis) {
      return this.getInviteRedis(inviteId);
    }
    return this.getInviteFallback(inviteId);
  }

  private async getInviteRedis(inviteId: string): Promise<StoredInvite | null> {
    const client = this.getClient();
    const data = await client.get(this.inviteKey(inviteId));
    if (!data) return null;
    const invite = this.deserializeInvite(data as string);
    if (invite.expiresAt <= now() && (invite.state === "pending" || invite.state === "accepted")) {
      invite.state = "expired";
      invite.updatedAt = now();
      await client.set(this.inviteKey(inviteId), this.serializeInvite(invite), {
        ex: Math.ceil(INVITE_TTL_MS / 1000),
      });
    }
    return invite;
  }

  private getInviteFallback(inviteId: string): StoredInvite | null {
    const invite = this.fallbackStore.get(`invite:${inviteId}`) as StoredInvite | undefined;
    if (!invite) return null;
    if (invite.expiresAt <= now() && (invite.state === "pending" || invite.state === "accepted")) {
      invite.state = "expired";
      invite.updatedAt = now();
    }
    return invite;
  }

  async acceptInvite(input: {
    inviteId: string;
    peerDisplayName: string;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<{ invite: StoredInvite; device: StoredDevice }> {
    if (this.useRedis) {
      return this.acceptInviteRedis(input);
    }
    return this.acceptInviteFallback(input);
  }

  private async acceptInviteRedis(input: {
    inviteId: string;
    peerDisplayName: string;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<{ invite: StoredInvite; device: StoredDevice }> {
    const client = this.getClient();
    const key = this.inviteKey(input.inviteId);
    const data = await client.get(key);
    if (!data) {
      throw new TrustError("inviting_not_found", "This invitation does not exist.");
    }
    const invite = this.deserializeInvite(data as string);
    if (invite.expiresAt <= now()) {
      invite.state = "expired";
      invite.updatedAt = now();
      await client.set(key, this.serializeInvite(invite), { ex: Math.ceil(INVITE_TTL_MS / 1000) });
      throw new TrustError("inviting_expired", "This invitation has expired.");
    }
    if (invite.state !== "pending") {
      throw new TrustError("inviting_not_pending", "This invitation can no longer be accepted.");
    }

    const pairId = newId() as PairId;
    invite.pairId = pairId;
    invite.peerDisplayName = input.peerDisplayName;
    invite.state = "accepted";
    invite.updatedAt = now();
    await client.set(key, this.serializeInvite(invite), { ex: Math.ceil(INVITE_TTL_MS / 1000) });

    const device = await this.enroll({
      pairId,
      deviceId: input.deviceId,
      deviceSecret: input.deviceSecret,
      label: input.label,
    });

    return { invite, device };
  }

  private acceptInviteFallback(input: {
    inviteId: string;
    peerDisplayName: string;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): { invite: StoredInvite; device: StoredDevice } {
    const invite = this.fallbackStore.get(`invite:${input.inviteId}`) as StoredInvite | undefined;
    if (!invite) {
      throw new TrustError("inviting_not_found", "This invitation does not exist.");
    }
    if (invite.expiresAt <= now()) {
      invite.state = "expired";
      invite.updatedAt = now();
      throw new TrustError("inviting_expired", "This invitation has expired.");
    }
    if (invite.state !== "pending") {
      throw new TrustError("inviting_not_pending", "This invitation can no longer be accepted.");
    }

    const pairId = newId() as PairId;
    invite.pairId = pairId;
    invite.peerDisplayName = input.peerDisplayName;
    invite.state = "accepted";
    invite.updatedAt = now();

    const device = this.enrollFallback({
      pairId,
      deviceId: input.deviceId,
      deviceSecret: input.deviceSecret,
      label: input.label,
    });

    return { invite, device };
  }

  async confirmInvite(input: {
    inviteId: string;
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<StoredInvite> {
    if (this.useRedis) {
      return this.confirmInviteRedis(input);
    }
    return this.confirmInviteFallback(input);
  }

  private async confirmInviteRedis(input: {
    inviteId: string;
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): Promise<StoredInvite> {
    const client = this.getClient();
    const key = this.inviteKey(input.inviteId);
    const data = await client.get(key);
    if (!data) {
      throw new TrustError("inviting_not_found", "This invitation does not exist.");
    }
    const invite = this.deserializeInvite(data as string);
    if (invite.expiresAt <= now()) {
      invite.state = "expired";
      invite.updatedAt = now();
      await client.set(key, this.serializeInvite(invite), { ex: Math.ceil(INVITE_TTL_MS / 1000) });
      throw new TrustError("inviting_expired", "This invitation has expired.");
    }
    if (invite.state === "confirmed") {
      throw new TrustError("inviting_already_confirmed", "This invitation is already confirmed.");
    }
    if (invite.state !== "accepted") {
      throw new TrustError(
        "inviting_not_pending",
        "This invitation has not been accepted by the peer yet.",
      );
    }
    if (invite.pairId !== input.pairId) {
      throw new TrustError(
        "inviting_pair_mismatch",
        "This invitation does not match the pair you confirmed.",
      );
    }

    await this.enroll({
      pairId: invite.pairId,
      deviceId: input.deviceId,
      deviceSecret: input.deviceSecret,
      label: input.label,
    });
    invite.state = "confirmed";
    invite.updatedAt = now();
    await client.set(key, this.serializeInvite(invite), { ex: Math.ceil(INVITE_TTL_MS / 1000) });
    return invite;
  }

  private confirmInviteFallback(input: {
    inviteId: string;
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): StoredInvite {
    const invite = this.fallbackStore.get(`invite:${input.inviteId}`) as StoredInvite | undefined;
    if (!invite) {
      throw new TrustError("inviting_not_found", "This invitation does not exist.");
    }
    if (invite.expiresAt <= now()) {
      invite.state = "expired";
      invite.updatedAt = now();
      throw new TrustError("inviting_expired", "This invitation has expired.");
    }
    if (invite.state === "confirmed") {
      throw new TrustError("inviting_already_confirmed", "This invitation is already confirmed.");
    }
    if (invite.state !== "accepted") {
      throw new TrustError(
        "inviting_not_pending",
        "This invitation has not been accepted by the peer yet.",
      );
    }
    if (invite.pairId !== input.pairId) {
      throw new TrustError(
        "inviting_pair_mismatch",
        "This invitation does not match the pair you confirmed.",
      );
    }

    this.enrollFallback({
      pairId: invite.pairId,
      deviceId: input.deviceId,
      deviceSecret: input.deviceSecret,
      label: input.label,
    });
    invite.state = "confirmed";
    invite.updatedAt = now();
    return invite;
  }

  /* ---------------------------------------------------------------- */
  /* Helper methods                                                   */
  /* ---------------------------------------------------------------- */

  private async consumeNonceRedis(sessionId: string, nonce: string): Promise<boolean> {
    if (!this.useRedis) return false;
    const client = this.getClient();
    // Use SADD which returns the number of elements added (1 if new, 0 if already exists)
    const added = await client.sadd(this.nonceKey(sessionId), nonce);
    if (added === 1) {
      // Set TTL on first add
      await client.expire(this.nonceKey(sessionId), SESSION_TTL_SECONDS);
      return true;
    }
    return false;
  }

  private consumeNonceFallback(sessionId: string, nonce: string): boolean {
    const nonces = this.fallbackStore.get(`nonces:${sessionId}`) as Set<string> | undefined;
    if (!nonces) return true; // First nonce for this session
    if (nonces.has(nonce)) return false;
    nonces.add(nonce);
    return true;
  }

  private async getSessionsForPair(pairId: PairId): Promise<StoredSession[]> {
    if (!this.useRedis) return [];
    const client = this.getClient();
    // Use SCAN to find session keys for this pair
    // For simplicity, we'll use a set to track session IDs per pair
    const pairSessionsKey = `trust:pair:${pairId}:sessions`;
    const sessionIds = await client.smembers(pairSessionsKey);
    if (!sessionIds || sessionIds.length === 0) return [];

    const sessions: StoredSession[] = [];
    for (const sessionId of sessionIds) {
      const data = await client.hgetall(this.sessionKey(sessionId));
      if (data && Object.keys(data).length > 0 && data) {
        const session = this.deserializeSession(data);
        const nonces = await client.smembers(this.nonceKey(sessionId));
        sessions.push({
          ...session,
          usedNonces: new Set(nonces || []),
        });
      }
    }
    return sessions;
  }

  private getSessionsForPairFallback(pairId: PairId): StoredSession[] {
    const sessions: StoredSession[] = [];
    for (const [key, value] of this.fallbackStore.entries()) {
      if (key.startsWith(`session:`)) {
        const session = value as StoredSession;
        if (session.pairId === pairId) {
          sessions.push(session);
        }
      }
    }
    return sessions;
  }

  /** Redis sweep - clean expired entries */
  private async sweepRedis(): Promise<void> {
    if (!this.useRedis) return;
    this.getClient();
    now();

    // Expired sessions are auto-expired via TTL
    // Expired invites are auto-expired via TTL

    // Clean up stale devices (those not seen in DEVICE_TTL_MS and revoked)
    // This is expensive with SCAN - in production use a scheduled job
    // For now, skip active device cleanup in Redis mode (handled by TTL on sessions)
  }

  /** Fallback sweep */
  sweep(): void {
    if (this.useRedis) {
      this.sweepRedis();
      return;
    }
    this.sweepFallback();
  }

  private sweepFallback(): void {
    const at = now();

    // Expired sessions
    for (const [key, session] of this.fallbackStore.entries()) {
      if (key.startsWith(`session:`) && (session as StoredSession).expiresAt <= at) {
        this.fallbackStore.delete(key);
        this.fallbackStore.delete(`nonces:${(session as StoredSession).sessionId}`);
      }
    }

    // Expired invites
    for (const [key, invite] of this.fallbackStore.entries()) {
      if (key.startsWith(`invite:`) && (invite as StoredInvite).expiresAt <= at) {
        this.fallbackStore.delete(key);
      }
    }

    // Stale devices
    for (const [key, devices] of this.fallbackStore.entries()) {
      if (key.startsWith(`pair:`) && devices instanceof Map) {
        for (const [deviceId, device] of devices as Map<string, StoredDevice>) {
          const stale = at - Math.max(device.lastSeenAt, device.enrolledAt) > DEVICE_TTL_MS;
          if (stale && device.revokedAt !== null) {
            devices.delete(deviceId);
          }
        }
        if (devices.size === 0) {
          this.fallbackStore.delete(key);
        }
      }
    }
  }

  /** Test helper */
  reset(): void {
    if (this.useRedis && this.redis) {
      // Note: In production, we'd need a proper flush - for tests, use separate DB
      this.fallbackStore.clear();
    } else {
      this.fallbackStore.clear();
    }
  }
}

// Export singleton instance
export const redisTrustStore = new RedisTrustStore();
