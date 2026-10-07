/**
 * Mobile client for the trusted-call protocol.
 *
 * Every request is authenticated with a single-use proof bound to a fresh nonce
 * and timestamp (see `lib/trust/proof.ts`). There is no static bearer token
 * anywhere in this flow.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/lib/config";
import {
  computeDeviceProof,
  verifyAttestation,
  TRUST_PROTOCOL,
} from "@/lib/trust/proof";
import { getDeviceId, getDeviceSecret, newNonce } from "@/lib/trust/deviceIdentity";
import { z } from "zod";

export const trustStateSchema = z.enum(["unverified", "trusted"]);

export interface OpenSessionResult {
  sessionId: string;
  pairId: string;
  challengeNonce: string;
  openedByDeviceId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface PendingSession {
  sessionId: string;
  pairId: string;
  challengeNonce: string;
  openedByDeviceId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface SessionStatus {
  sessionId: string;
  pairId: string;
  state: z.infer<typeof trustStateSchema>;
  initiatorDeviceId: string;
  peerDeviceId: string | null;
  attestation: string | null;
  issuedAt: number;
  expiresAt: number;
  token?: string;
}

export interface CircleDevice {
  deviceId: string;
  label: string | null;
  enrolledAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

const openSessionSchema = z.object({
  sessionId: z.string(),
  pairId: z.string(),
  challengeNonce: z.string(),
  openedByDeviceId: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

const pendingListSchema = z.object({ sessions: z.array(openSessionSchema) });

const sessionStatusSchema = z.object({
  sessionId: z.string(),
  pairId: z.string(),
  state: trustStateSchema,
  initiatorDeviceId: z.string(),
  peerDeviceId: z.string().nullable(),
  attestation: z.string().nullable(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  token: z.string().optional(),
});

const circleSchema = z.object({
  pairId: z.string(),
  devices: z.array(
    z.object({
      deviceId: z.string(),
      label: z.string().nullable(),
      enrolledAt: z.string(),
      lastSeenAt: z.string().nullable(),
      revokedAt: z.string().nullable(),
    }),
  ),
  authorized: z.boolean(),
});

const enrollSchema = z.object({
  pairId: z.string(),
  deviceId: z.string(),
  enrolledAt: z.string(),
  label: z.string().nullable(),
});

/** Distinguishes "backend unreachable" from "backend said no". */
export class TrustNetworkError extends Error {
  readonly offline = true;
  constructor(message: string) {
    super(message);
    this.name = "TrustNetworkError";
  }
}

export class TrustApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TrustApiError";
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new TrustNetworkError("The server address is not configured in this build.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers: { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch {
    // Any transport failure is treated as "cannot confirm", never as "trusted".
    throw new TrustNetworkError("Handshake cannot reach the server.");
  } finally {
    clearTimeout(timer);
  }

  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ code: z.string(), message: z.string() }) })
      .safeParse(raw);
    throw new TrustApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "http_error",
      parsed.success ? parsed.data.error.message : `Request failed (${response.status}).`,
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new TrustApiError(response.status, "bad_response", "The server sent an unexpected answer.");
  }
  return result.data;
}

/** Enrols this device into a circle. Called from pre-call trust management. */
export async function enrollDevice(pairId: string, label?: string): Promise<void> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  await request("/api/trust/enroll", enrollSchema, {
    method: "POST",
    body: { pairId, deviceId, deviceSecret, label },
  });
}

export async function getCircle(pairId: string): Promise<{
  devices: CircleDevice[];
  authorized: boolean;
}> {
  const result = await request(`/api/trust/circle?pairId=${encodeURIComponent(pairId)}`, circleSchema);
  return { devices: result.devices, authorized: result.authorized };
}

/**
 * Revokes a device, or the whole circle.
 *
 * `targetDeviceId` may be this device (leaving the circle on this phone).
 */
export async function revokeDevice(input: {
  pairId: string;
  targetDeviceId: string;
  revokeWholeCircle?: boolean;
}): Promise<{ revokedDeviceIds: string[] }> {
  const actorDeviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const actorNonce = newNonce();
  const actorIssuedAt = Date.now();
  const actorProof = await computeDeviceProof({
    pairId: input.pairId,
    deviceId: actorDeviceId,
    sessionId: TRUST_PROTOCOL,
    nonce: actorNonce,
    issuedAt: actorIssuedAt,
    deviceSecret,
  });
  const schema = z.object({
    pairId: z.string(),
    revokedDeviceIds: z.array(z.string()),
    revokedAt: z.string(),
  });
  const result = await request("/api/trust/revoke", schema, {
    method: "POST",
    body: {
      pairId: input.pairId,
      actorDeviceId,
      actorNonce,
      actorIssuedAt,
      actorProof,
      targetDeviceId: input.targetDeviceId,
      revokeWholeCircle: input.revokeWholeCircle ?? false,
    },
  });
  return { revokedDeviceIds: result.revokedDeviceIds };
}

/** Opens a call session for this circle. */
export async function openSession(pairId: string): Promise<OpenSessionResult> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const nonce = newNonce();
  const issuedAt = Date.now();
  const proof = await computeDeviceProof({
    pairId,
    deviceId,
    sessionId: TRUST_PROTOCOL,
    nonce,
    issuedAt,
    deviceSecret,
  });
  return request("/api/trust/session", openSessionSchema, {
    method: "POST",
    body: { pairId, deviceId, nonce, issuedAt, proof },
  });
}

/** Looks for an open session opened by the peer device. */
export async function findPendingSession(pairId: string): Promise<PendingSession | null> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const nonce = newNonce();
  const issuedAt = Date.now();
  const proof = await computeDeviceProof({
    pairId,
    deviceId,
    sessionId: TRUST_PROTOCOL,
    nonce,
    issuedAt,
    deviceSecret,
  });
  const query = new URLSearchParams({
    pairId,
    deviceId,
    nonce,
    issuedAt: String(issuedAt),
    proof,
  });
  const result = await request(`/api/trust/session/pending?${query.toString()}`, pendingListSchema);
  return result.sessions[0] ?? null;
}

/** Joins the peer's session. A successful call is the only path to `trusted`. */
export async function joinSession(input: {
  sessionId: string;
  pairId: string;
  peerDeviceId: string;
}): Promise<SessionStatus> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const nonce = newNonce();
  const issuedAt = Date.now();
  const proof = await computeDeviceProof({
    pairId: input.pairId,
    deviceId,
    sessionId: input.sessionId,
    nonce,
    issuedAt,
    deviceSecret,
  });
  const schema = sessionStatusSchema.extend({ state: z.literal("trusted") });
  return request(`/api/trust/session/${input.sessionId}/join`, schema, {
    method: "POST",
    body: { sessionId: input.sessionId, deviceId, nonce, issuedAt, proof },
  });
}

/** Polls an open session. Read-only: it can never turn a session into `trusted`. */
export async function pollSession(pairId: string, sessionId: string): Promise<SessionStatus> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const nonce = newNonce();
  const issuedAt = Date.now();
  const proof = await computeDeviceProof({
    pairId,
    deviceId,
    sessionId,
    nonce,
    issuedAt,
    deviceSecret,
  });
  const query = new URLSearchParams({
    deviceId,
    nonce,
    issuedAt: String(issuedAt),
    proof,
  });
  return request(`/api/trust/session/${sessionId}?${query.toString()}`, sessionStatusSchema);
}

/**
 * Independently verifies a confirmed session against this device's own circle
 * secret.
 *
 * Both the `serverConfirmed` and `attestationVerified` flags in the call-state
 * model must be true before a trusted state is shown. A server response that
 * cannot be verified locally is treated as unverified.
 */
export async function verifySessionTrust(input: {
  pairId: string;
  status: SessionStatus;
}): Promise<{ serverConfirmed: boolean; attestationVerified: boolean }> {
  if (input.status.state !== "trusted" || input.status.peerDeviceId === null) {
    return { serverConfirmed: false, attestationVerified: false };
  }
  if (!input.status.attestation) {
    return { serverConfirmed: true, attestationVerified: false };
  }
  const attestationVerified = await verifyAttestation(input.status.attestation, {
    pairId: input.pairId,
    sessionId: input.status.sessionId,
    initiatorDeviceId: input.status.initiatorDeviceId,
    peerDeviceId: input.status.peerDeviceId,
    issuedAt: input.status.issuedAt,
    expiresAt: input.status.expiresAt,
  });
  return { serverConfirmed: true, attestationVerified };
}