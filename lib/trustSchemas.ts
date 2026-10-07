/**
 * Wire contracts for the trusted-call protocol.
 *
 * Every request body is validated here before it reaches the trust store
 * (AGENTS.md rule 6: treat client input as untrusted data).
 */

import { z } from "zod";

export const pairIdSchema = z.string().regex(/^[a-f0-9]{32}$/, "A pair code is 32 hex characters");
export type PairId = z.infer<typeof pairIdSchema>;

export const deviceIdSchema = z.string().regex(/^[a-f0-9]{32}$/, "A device id is 32 hex characters");
export type DeviceId = z.infer<typeof deviceIdSchema>;

/** 64 hex characters = 32 random bytes generated on the device. */
export const deviceSecretSchema = z.string().regex(/^[a-f0-9]{64}$/, "A device secret is 64 hex characters");

export const nonceSchema = z.string().regex(/^[a-f0-9]{32}$/, "A nonce is 32 hex characters");

export const sessionIdSchema = z.string().regex(/^[a-f0-9]{32}$/, "A session id is 32 hex characters");

export const hexProofSchema = z.string().regex(/^[a-f0-9]{64}$/, "A proof is 64 hex characters");

/* ------------------------------------------------------------------ */
/* Device enrolment (pre-call trust establishment)                    */
/* ------------------------------------------------------------------ */

export const enrollDeviceRequestSchema = z.object({
  pairId: pairIdSchema,
  deviceId: deviceIdSchema,
  deviceSecret: deviceSecretSchema,
  label: z.string().trim().min(1).max(60).optional(),
});
export type EnrollDeviceRequest = z.infer<typeof enrollDeviceRequestSchema>;

export const enrollDeviceResponseSchema = z.object({
  pairId: pairIdSchema,
  deviceId: deviceIdSchema,
  enrolledAt: z.string().datetime(),
  label: z.string().max(60).nullable(),
});
export type EnrollDeviceResponse = z.infer<typeof enrollDeviceResponseSchema>;

/* ------------------------------------------------------------------ */
/* Revocation (pre-call trust management)                              */
/* ------------------------------------------------------------------ */

export const revokeDeviceRequestSchema = z.object({
  pairId: pairIdSchema,
  /** Device performing the revocation. Must itself be an active member. */
  actorDeviceId: deviceIdSchema,
  actorNonce: nonceSchema,
  actorIssuedAt: z.number().int().nonnegative(),
  actorProof: hexProofSchema,
  /** Device to revoke. May equal `actorDeviceId` (self-revocation). */
  targetDeviceId: deviceIdSchema,
  /** Revoke every device of the pair, not just `targetDeviceId`. */
  revokeWholeCircle: z.boolean().optional(),
});
export type RevokeDeviceRequest = z.infer<typeof revokeDeviceRequestSchema>;

export const revokeDeviceResponseSchema = z.object({
  pairId: pairIdSchema,
  revokedDeviceIds: z.array(deviceIdSchema),
  revokedAt: z.string().datetime(),
});
export type RevokeDeviceResponse = z.infer<typeof revokeDeviceResponseSchema>;

/* ------------------------------------------------------------------ */
/* Call sessions (in-call mutual authentication)                      */
/* ------------------------------------------------------------------ */

export const openSessionRequestSchema = z.object({
  pairId: pairIdSchema,
  deviceId: deviceIdSchema,
  nonce: nonceSchema,
  issuedAt: z.number().int().nonnegative(),
  proof: hexProofSchema,
});
export type OpenSessionRequest = z.infer<typeof openSessionRequestSchema>;

export const openSessionResponseSchema = z.object({
  sessionId: sessionIdSchema,
  pairId: pairIdSchema,
  /** Server nonce that must be echoed by both proofs for this session. */
  challengeNonce: nonceSchema,
  openedByDeviceId: deviceIdSchema,
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  status: z.literal("awaiting-peer"),
});
export type OpenSessionResponse = z.infer<typeof openSessionResponseSchema>;

export const joinSessionRequestSchema = z.object({
  sessionId: sessionIdSchema,
  deviceId: deviceIdSchema,
  nonce: nonceSchema,
  issuedAt: z.number().int().nonnegative(),
  proof: hexProofSchema,
});
export type JoinSessionRequest = z.infer<typeof joinSessionRequestSchema>;

/**
 * The only three call-time states a client may act on.
 *
 * `unverified` deliberately covers every unresolved case — peer offline, peer
 * without Handshake, peer not trusted, proof rejected, session expired, backend
 * unreachable. It must never be rendered as a protection claim.
 */
export const trustStateSchema = z.enum(["unverified", "trusted"]);
export type TrustState = z.infer<typeof trustStateSchema>;

export const joinSessionResponseSchema = z.object({
  sessionId: sessionIdSchema,
  pairId: pairIdSchema,
  state: trustStateSchema,
  peerDeviceId: deviceIdSchema.nullable(),
  attestation: z.string().nullable(),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
});
export type JoinSessionResponse = z.infer<typeof joinSessionResponseSchema>;

export const getSessionQuerySchema = z.object({
  deviceId: deviceIdSchema,
  nonce: nonceSchema,
  issuedAt: z.coerce.number().int().nonnegative(),
  proof: hexProofSchema,
});
export type GetSessionQuery = z.infer<typeof getSessionQuerySchema>;

export const sessionStatusResponseSchema = z.object({
  sessionId: sessionIdSchema,
  pairId: pairIdSchema,
  state: trustStateSchema,
  initiatorDeviceId: deviceIdSchema,
  peerDeviceId: deviceIdSchema.nullable(),
  attestation: z.string().nullable(),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
});
export type SessionStatusResponse = z.infer<typeof sessionStatusResponseSchema>;

/* ------------------------------------------------------------------ */
/* Pre-call trusted-circle status                                      */
/* ------------------------------------------------------------------ */

export const circleStatusQuerySchema = z.object({
  deviceId: deviceIdSchema.optional(),
  nonce: nonceSchema.optional(),
  issuedAt: z.coerce.number().int().nonnegative().optional(),
  proof: hexProofSchema.optional(),
});
export type CircleStatusQuery = z.infer<typeof circleStatusQuerySchema>;

export const enrolledDeviceSchema = z.object({
  deviceId: deviceIdSchema,
  label: z.string().max(60).nullable(),
  enrolledAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});
export type EnrolledDevice = z.infer<typeof enrolledDeviceSchema>;

export const circleStatusResponseSchema = z.object({
  pairId: pairIdSchema,
  devices: z.array(enrolledDeviceSchema),
  /** True only when the calling device presented a valid proof. */
  authorized: z.boolean(),
});
export type CircleStatusResponse = z.infer<typeof circleStatusResponseSchema>;