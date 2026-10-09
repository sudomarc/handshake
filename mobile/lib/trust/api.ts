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
  const result = await request(`/api/trust/circle?${query.toString()}`, circleSchema);
  return { devices: result.devices, authorized: result.authorized };
}

/**
 * Relationship state shown next to a trusted person on the list and detail
 * screens.
 *
 * "Trusted" means the circle is confirmed and at least one enrolled phone has
 * not been revoked. "Verify" covers everything else: revocation, or a pairing
 * that has only just begun (the other phone has not confirmed yet).
 */
export function relationState(circle: {
  devices: CircleDevice[];
  authorized: boolean;
}): "trusted" | "verify" {
  if (!circle.authorized) return "verify";
  const activeDevice = circle.devices.some((device) => device.revokedAt === null);
  return activeDevice ? "trusted" : "verify";
}

/* ------------------------------------------------------------------ */
/* Short-lived QR physical pairing (invite flow)                       */
/* ------------------------------------------------------------------ */

export const inviteStateSchema = z.enum([
  "pending",
  "accepted",
  "confirmed",
  "expired",
  "cancelled",
]);
export type InviteState = z.infer<typeof inviteStateSchema>;

export interface InviteStatus {
  inviteId: string;
  displayName: string;
  peerName: string | null;
  state: InviteState;
  createdAt: string;
  expiresAt: string;
  pairId?: string;
}

const createInviteSchema = z.object({
  inviteId: z.string().min(1),
  displayName: z.string(),
  expiresAt: z.string(),
  url: z.string(),
});

const inviteStatusSchema = z.object({
  inviteId: z.string(),
  displayName: z.string(),
  peerName: z.string().nullable().optional(),
  state: inviteStateSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  pairId: z.string().optional(),
});

/**
 * The accept/confirm responses are intentionally parsed loosely: the parallel
 * backend may add fields (e.g. `enrolledAt`, `label`), and the client only
 * needs the state and the opaque `pairId`.
 */
const acceptedResponseSchema = z
  .object({
    state: z.literal("accepted"),
    pairId: z.string().min(1),
  })
  .passthrough();

const confirmedResponseSchema = z
  .object({
    state: z.literal("confirmed"),
    pairId: z.string().min(1),
  })
  .passthrough();

/** Creates a one-time pairing invite for this phone's QR code. */
export async function createInvite(displayName: string): Promise<{
  inviteId: string;
  displayName: string;
  expiresAt: string;
  url: string;
}> {
  return request("/api/trust/invite", createInviteSchema, {
    method: "POST",
    body: { displayName },
  });
}

/** Reads one invite's live status. Read-only: never changes the invite. */
export async function getInvite(inviteId: string): Promise<InviteStatus> {
  const result = await request(
    `/api/trust/invite/${encodeURIComponent(inviteId)}`,
    inviteStatusSchema,
  );
  return {
    inviteId: result.inviteId,
    displayName: result.displayName,
    peerName: result.peerName ?? null,
    state: result.state,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
    pairId: result.pairId,
  };
}

/** Enrols the scanning phone (Device B) into the new relation. */
export async function acceptInvite(input: {
  inviteId: string;
  displayName: string;
  label?: string;
}): Promise<{ state: "accepted"; pairId: string }> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const result = await request(`/api/trust/invite/${encodeURIComponent(input.inviteId)}/accept`, acceptedResponseSchema, {
    method: "POST",
    body: {
      displayName: input.displayName,
      deviceId,
      deviceSecret,
      label: input.label,
    },
  });
  return { state: result.state, pairId: result.pairId };
}

/** Enrols the QR owner (Device A) after the peer accepted. */
export async function confirmInvite(input: {
  inviteId: string;
  pairId: string;
  label?: string;
}): Promise<{ state: "confirmed"; pairId: string }> {
  const deviceId = await getDeviceId();
  const deviceSecret = await getDeviceSecret();
  const result = await request(`/api/trust/invite/${encodeURIComponent(input.inviteId)}/confirm`, confirmedResponseSchema, {
    method: "POST",
    body: {
      pairId: input.pairId,
      deviceId,
      deviceSecret,
      label: input.label,
    },
  });
  return { state: result.state, pairId: result.pairId };
}

/**
 * URL of the server-rendered QR PNG for an invite. Rendered directly with an
 * `<Image source={{ uri }}>`, so no API response parsing is involved.
 */
export function inviteQrUrl(inviteId: string): string | null {
  if (!API_BASE_URL) return null;
  return `${API_BASE_URL}/api/trust/invite/${encodeURIComponent(inviteId)}/qr`;
}

/**
 * Extracts the invite id from a scanned/linked pairing URL.
 *
 * Accepts both forms the product renders or shares:
 *   handshake://pair?invite=<id>
 *   https://<host>/pair?invite=<id>
 *
 * The invite id is opaque to the client: there is deliberately no format check
 * beyond "non-empty", because the backend owns its id scheme.
 */
export { parsePairInvite } from "@/lib/trust/pairLink";

/**
 * Lightweight reachability probe used by the home surface. Any HTTP response
 * (including 4xx/5xx) means the server answered; only a transport failure
 * means offline. Never used to make a trust claim.
 */
export async function pingBackend(): Promise<boolean> {
  if (!API_BASE_URL) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    await fetch(`${API_BASE_URL}/api/trust/ping`, { signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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