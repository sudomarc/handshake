/**
 * In-memory store for enrolled devices and in-flight call sessions.
 *
 * Honest limitation (matches `lib/rateLimit.ts` and `lib/callStore.ts`):
 * this state lives in a single server process. On serverless hosting several
 * instances run side by side, each with its own copy, so an enrolment performed
 * on instance A is invisible to instance B. That means trusted-call recognition
 * can fail open to `unverified` (honest, not dangerous) but cannot currently
 * fail *closed* across instances. Production requires a shared, durable store.
 * See SECURITY.md "Production requirements".
 */

import { randomBytes } from "node:crypto";
import {
  sessionAttestation,
  issueSessionToken,
  verifyDeviceProof,
  TRUST_PROTOCOL,
  type DeviceId,
  type PairId,
} from "./trustCrypto";
import type { TrustState } from "./trustSchemas";

/** How long a call session may stay open waiting for the peer device. */
export const SESSION_TTL_MS = 5 * 60_000;
/** How long an enrolled device stays "recently seen" before it is swept. */
export const DEVICE_TTL_MS = 90 * 24 * 60 * 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const MAX_PAIRS = 10_000;
const MAX_SESSIONS_PER_PAIR = 8;

export interface StoredDevice {
  deviceId: DeviceId;
  label: string | null;
  /** Server-held symmetric credential. Never returned to any client. */
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
  /** Nonces already accepted for this session. Each may be used exactly once. */
  usedNonces: Set<string>;
  state: TrustState;
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
  | "circle_limit";

export class TrustError extends Error {
  constructor(
    readonly code: TrustErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrustError";
  }
}

function hex(bytes: number): string {
  return Buffer.from(bytes).toString("hex");
}

function newId(): string {
  return hex(randomBytes(16));
}

function now(): number {
  return Date.now();
}

class TrustStore {
  private pairs = new Map<PairId, Map<DeviceId, StoredDevice>>();
  private sessions = new Map<string, StoredSession>();
  private timer: NodeJS.Timeout | null;

  constructor() {
    // unref keeps the sweep timer from holding the process open in tests.
    this.timer = setInterval(() => this.sweep(), CLEANUP_INTERVAL_MS);
    this.timer.unref?.();
  }

  /* ---------------------------------------------------------------- */
  /* Pre-call enrolment                                               */
  /* ---------------------------------------------------------------- */

  enroll(input: {
    pairId: PairId;
    deviceId: DeviceId;
    deviceSecret: string;
    label?: string;
  }): StoredDevice {
    let devices = this.pairs.get(input.pairId);
    if (!devices) {
      if (this.pairs.size >= MAX_PAIRS) {
        this.sweep();
        if (this.pairs.size >= MAX_PAIRS) {
          throw new TrustError("circle_limit", "Too many trusted circles are active.");
        }
      }
      devices = new Map();
      this.pairs.set(input.pairId, devices);
    }

    const existing = devices.get(input.deviceId);
    const at = now();
    const device: StoredDevice = {
      deviceId: input.deviceId,
      label: input.label ?? existing?.label ?? null,
      deviceSecret: input.deviceSecret,
      enrolledAt: existing?.enrolledAt ?? at,
      lastSeenAt: at,
      // Re-enrolling an explicitly revoked device requires a new device id.
      revokedAt: null,
    };
    devices.set(input.deviceId, device);
    return device;
  }

  revoke(input: {
    pairId: PairId;
    actor: { deviceId: DeviceId; nonce: string; issuedAt: number; proof: string };
    targetDeviceId: DeviceId;
    revokeWholeCircle: boolean;
  }): DeviceId[] {
    const devices = this.pairs.get(input.pairId);
    if (!devices) throw new TrustError("device_not_enrolled", "This device is not enrolled.");

    const actor = this.requireActiveDevice(input.pairId, input.actor.deviceId);
    this.verifyProof({
      pairId: input.pairId,
      deviceId: input.actor.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.actor.nonce,
      issuedAt: input.actor.issuedAt,
      proof: input.actor.proof,
      deviceSecret: actor.deviceSecret,
    });

    const at = now();
    const targets = input.revokeWholeCircle
      ? [...devices.values()].filter((d) => d.revokedAt === null)
      : [devices.get(input.targetDeviceId)].filter(
          (d): d is StoredDevice => Boolean(d) && (d as StoredDevice).revokedAt === null,
        );

    const revoked: DeviceId[] = [];
    for (const device of targets) {
      device.revokedAt = at;
      revoked.push(device.deviceId);
    }

    // A revocation must not leave a live, previously confirmed session usable.
    for (const session of this.sessions.values()) {
      if (session.pairId !== input.pairId) continue;
      const touched =
        revoked.includes(session.initiatorDeviceId) ||
        (session.peerDeviceId !== null && revoked.includes(session.peerDeviceId));
      if (touched && session.state === "trusted") session.state = "unverified";
    }

    return revoked;
  }

  listDevices(pairId: PairId): StoredDevice[] {
    const devices = this.pairs.get(pairId);
    if (!devices) return [];
    return [...devices.values()].sort((a, b) => a.enrolledAt - b.enrolledAt);
  }

  /* ---------------------------------------------------------------- */
  /* In-call sessions                                                  */
  /* ---------------------------------------------------------------- */

  openSession(input: {
    pairId: PairId;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const device = this.requireActiveDevice(input.pairId, input.deviceId);
    this.verifyProof({
      pairId: input.pairId,
      deviceId: input.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      proof: input.proof,
      deviceSecret: device.deviceSecret,
    });

    const pairSessions = [...this.sessions.values()].filter(
      (s) => s.pairId === input.pairId && s.expiresAt > now(),
    );
    if (pairSessions.length >= MAX_SESSIONS_PER_PAIR) {
      // Drop the oldest unbound session rather than refuse a live call.
      const stale = pairSessions
        .filter((s) => s.state === "unverified")
        .sort((a, b) => a.issuedAt - b.issuedAt)[0];
      if (stale) this.sessions.delete(stale.sessionId);
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
    // The nonce the initiator used is spent here.
    this.consumeNonce(session, input.nonce);
    device.lastSeenAt = at;
    this.sessions.set(session.sessionId, session);
    return session;
  }

  joinSession(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const session = this.requireLiveSession(input.sessionId);
    const device = this.requireActiveDevice(session.pairId, input.deviceId);

    this.verifyProof({
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      proof: input.proof,
      deviceSecret: device.deviceSecret,
    });
    this.consumeNonce(session, input.nonce);

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

  /** Open sessions of a circle, used by the peer-discovery endpoint. */
  listSessions(input: { pairId: PairId; excludeDeviceId: DeviceId }): StoredSession[] {
    this.sweep();
    const at = now();
    return [...this.sessions.values()]
      .filter(
        (s) =>
          s.pairId === input.pairId &&
          s.expiresAt > at &&
          s.initiatorDeviceId !== input.excludeDeviceId,
      )
      .sort((a, b) => a.issuedAt - b.issuedAt);
  }

  /**
   * Read-only status check for the initiator's polling loop.
   *
   * Read-only means a *revoked* device can still observe "unverified", but it
   * can never move a session to `trusted`: that requires a successful `joinSession`
   * proof, and `requireActiveDevice` rejects revoked devices there.
   */
  readSession(input: {
    sessionId: string;
    deviceId: DeviceId;
    nonce: string;
    issuedAt: number;
    proof: string;
  }): StoredSession {
    const session = this.requireLiveSession(input.sessionId);
    const device = this.requireActiveDevice(session.pairId, input.deviceId);
    this.verifyProof({
      pairId: session.pairId,
      deviceId: input.deviceId,
      sessionId: session.sessionId,
      nonce: input.nonce,
      issuedAt: input.issuedAt,
      proof: input.proof,
      deviceSecret: device.deviceSecret,
    });
    this.consumeNonce(session, input.nonce);
    device.lastSeenAt = now();
    return session;
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */

  requireActiveDevice(pairId: PairId, deviceId: DeviceId): StoredDevice {
    const device = this.pairs.get(pairId)?.get(deviceId);
    if (!device) {
      throw new TrustError("device_not_enrolled", "This device is not enrolled in this circle.");
    }
    if (device.revokedAt !== null) {
      throw new TrustError("device_revoked", "This device's trust has been revoked.");
    }
    return device;
  }

  private requireLiveSession(sessionId: string): StoredSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new TrustError("session_not_found", "Unknown call session.");
    if (session.expiresAt <= now()) {
      this.sessions.delete(sessionId);
      session.state = "unverified";
      throw new TrustError("session_expired", "This call session has expired.");
    }
    return session;
  }

  private consumeNonce(session: StoredSession, nonce: string): void {
    if (session.usedNonces.has(nonce)) {
      throw new TrustError("nonce_replayed", "This request has already been used.");
    }
    session.usedNonces.add(nonce);
  }

  private verifyProof(input: {
    pairId: PairId;
    deviceId: DeviceId;
    sessionId: string;
    nonce: string;
    issuedAt: number;
    proof: string;
    deviceSecret: string;
  }): void {
    const ok = verifyDeviceProof(input);
    if (!ok) throw new TrustError("invalid_proof", "This device could not be authenticated.");
  }

  sweep(): void {
    const at = now();
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt <= at) this.sessions.delete(sessionId);
    }
    for (const [pairId, devices] of this.pairs) {
      for (const [deviceId, device] of devices) {
        const stale = at - Math.max(device.lastSeenAt, device.enrolledAt) > DEVICE_TTL_MS;
        if (stale && device.revokedAt !== null) devices.delete(deviceId);
      }
      if (devices.size === 0) this.pairs.delete(pairId);
    }
  }

  /** Test helper only. */
  reset(): void {
    this.pairs.clear();
    this.sessions.clear();
  }
}

export const trustStore = new TrustStore();

export interface ResolvedSession {
  sessionId: string;
  pairId: PairId;
  state: TrustState;
  initiatorDeviceId: DeviceId;
  peerDeviceId: DeviceId | null;
  attestation: string | null;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Projects a stored session into the wire shape.
 *
 * `attestation` is only produced for `trusted` sessions, and it is derived from
 * the pair id so that both devices can recompute and verify it independently of
 * the server (see `lib/trustCrypto.ts`). An `unverified` session never carries
 * one, so a client can never show "Trusted connection" on the server's word alone.
 */
export function resolveSession(session: StoredSession): ResolvedSession {
  const trusted = session.state === "trusted" && session.peerDeviceId !== null;
  return {
    sessionId: session.sessionId,
    pairId: session.pairId,
    state: trusted ? "trusted" : "unverified",
    initiatorDeviceId: session.initiatorDeviceId,
    peerDeviceId: session.peerDeviceId,
    attestation: trusted
      ? sessionAttestation({
          pairId: session.pairId,
          sessionId: session.sessionId,
          initiatorDeviceId: session.initiatorDeviceId,
          peerDeviceId: session.peerDeviceId as DeviceId,
          issuedAt: session.issuedAt,
          expiresAt: session.expiresAt,
        })
      : null,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  };
}

/** Server-signed handle for a confirmed session. Opaque to the client. */
export function sessionTokenFor(session: StoredSession): string {
  if (session.state !== "trusted" || session.peerDeviceId === null) {
    throw new TrustError("invalid_proof", "This call session is not confirmed.");
  }
  return issueSessionToken({
    sessionId: session.sessionId,
    pairId: session.pairId,
    initiatorDeviceId: session.initiatorDeviceId,
    peerDeviceId: session.peerDeviceId,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  });
}