/**
 * Cryptographic primitives for the Handshake trusted-call protocol.
 *
 * Design notes (read before changing anything):
 *
 * 1. Identity is **server-authoritative**. Every trust decision is made by this
 *    API from evidence the client cannot forge on its own:
 *      - a device must have been *enrolled* into the pair (authorization for
 *        enrolment is knowledge of the `pairId`, which is already the shared
 *        membership secret in this architecture — see SECURITY.md T5);
 *      - the device must present a proof bound to a fresh server-issued nonce,
 *        the session id and a timestamp.
 *
 * 2. Nothing secret is embedded in the APK. A device secret is generated on the
 *    device (expo-crypto random bytes) and kept in the platform keystore
 *    (expo-secure-store). The server only ever learns it at enrolment.
 *
 * 3. **Known deviation — this is not RFC 2104 HMAC.** The Expo SDK 51 crypto
 *    module (`expo-crypto@13`) exposes only SHA digests over strings; it has no
 *    byte-wise XOR, so a textbook HMAC cannot be computed on the client. The
 *    proof below is therefore a *suffix-keyed* SHA-256 over a canonical string:
 *
 *        proof = SHA256( "handshake-trust-v1|proof|" + fields... + "|" + secret )
 *
 *    Putting the secret **last** is deliberate: SHA-256 length-extension
 *    attacks require the secret to be a *prefix*, so this construction is not
 *    length-extension vulnerable. It is still a hand-rolled MAC and must be
 *    treated as demo-grade. The production replacement is asymmetric device
 *    keys (Ed25519) with server-side public-key registration; see
 *    SECURITY.md "Production requirements".
 *
 * 4. Replay protection is threefold and lives in `lib/trustStore.ts`:
 *    single-use nonces, a bounded timestamp skew, and short session lifetimes.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { ConfigError } from "./errors";
import { deviceIdSchema, pairIdSchema, type DeviceId, type PairId } from "./trustSchemas";
export type { DeviceId, PairId };

/** Domain separator. Bump only together with a mobile client release. */
export const TRUST_PROTOCOL = "handshake-trust-v1";

const MIN_KEY_LENGTH = 32;

/** Maximum accepted clock skew for a proof timestamp, in milliseconds. */
export const MAX_CLOCK_SKEW_MS = 60_000;

function getServerKey(): string {
  const key = process.env.PAIR_DERIVATION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new ConfigError(
      `PAIR_DERIVATION_KEY must be set (at least ${MIN_KEY_LENGTH} characters)`,
    );
  }
  return key;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Joins canonical fields with `|`. `|` is not valid in any canonical field. */
function canonical(parts: string[]): string {
  return parts.join("|");
}

/**
 * Client-recomputable binding of a confirmed call session.
 *
 * It is derived from the `pairId` only, so *both* enrolled devices can verify it
 * locally without the server key. It proves: "the party that holds this pair's
 * membership secret asserts that this session pairs exactly these two devices,
 * for this window of time". It does **not** by itself prove who spoke on the
 * call — call-state detection is the only call evidence Handshake has.
 */
export function sessionAttestation(input: {
  pairId: PairId;
  sessionId: string;
  initiatorDeviceId: DeviceId;
  peerDeviceId: DeviceId;
  issuedAt: number;
  expiresAt: number;
}): string {
  return sha256Hex(
    canonical([
      TRUST_PROTOCOL,
      "attest",
      input.pairId,
      input.sessionId,
      input.initiatorDeviceId,
      input.peerDeviceId,
      String(input.issuedAt),
      String(input.expiresAt),
    ]),
  );
}

/** Canonical pre-image of a device proof. Kept separate so tests can assert on it. */
export function proofPreImage(input: {
  pairId: PairId;
  deviceId: DeviceId;
  sessionId: string;
  nonce: string;
  issuedAt: number;
  deviceSecret: string;
}): string {
  return canonical([
    TRUST_PROTOCOL,
    "proof",
    input.pairId,
    input.deviceId,
    input.sessionId,
    input.nonce,
    String(input.issuedAt),
    input.deviceSecret,
  ]);
}

/** Computes the device proof. Client and server must produce identical output. */
export function computeDeviceProof(input: {
  pairId: PairId;
  deviceId: DeviceId;
  sessionId: string;
  nonce: string;
  issuedAt: number;
  deviceSecret: string;
}): string {
  return sha256Hex(proofPreImage(input));
}

/** Constant-time comparison. Length mismatch is reported as "not equal", not as an error. */
export function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Verifies a proof and the timestamp window it carries. */
export function verifyDeviceProof(input: {
  expected: string;
  pairId: string;
  deviceId: string;
  sessionId: string;
  nonce: string;
  issuedAt: number;
  deviceSecret: string;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (Math.abs(now - input.issuedAt) > MAX_CLOCK_SKEW_MS) return false;

  const pairId = pairIdSchema.safeParse(input.pairId);
  const deviceId = deviceIdSchema.safeParse(input.deviceId);
  if (!pairId.success || !deviceId.success) return false;

  const actual = computeDeviceProof({
    pairId: pairId.data,
    deviceId: deviceId.data,
    sessionId: input.sessionId,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    deviceSecret: input.deviceSecret,
  });
  return safeEqualHex(actual, input.expected);
}

/**
 * Server-issued, short-lived call-session token.
 *
 * Signed with the server key, so only the server can mint or validate it. The
 * mobile client treats it as an opaque handle: it is what proves *to the
 * backend* that a call happened on a mutually recognised trusted pair. The
 * client-side `sessionAttestation` above is what the client itself can verify.
 */
export function issueSessionToken(input: {
  sessionId: string;
  pairId: PairId;
  initiatorDeviceId: DeviceId;
  peerDeviceId: DeviceId;
  issuedAt: number;
  expiresAt: number;
}): string {
  const payload = canonical([
    TRUST_PROTOCOL,
    "token",
    input.sessionId,
    input.pairId,
    input.initiatorDeviceId,
    input.peerDeviceId,
    String(input.issuedAt),
    String(input.expiresAt),
  ]);
  const signature = createHash("sha256")
    .update(`${getServerKey()}|${payload}`, "utf8")
    .digest("hex");
  return `${sha256Hex(payload)}.${signature}`;
}

export function verifySessionToken(
  token: string,
  expected: {
    sessionId: string;
    pairId: PairId;
    initiatorDeviceId: DeviceId;
    peerDeviceId: DeviceId;
    issuedAt: number;
    expiresAt: number;
  },
  now = Date.now(),
): boolean {
  if (now > expected.expiresAt) return false;
  const expectedToken = issueSessionToken(expected);
  return safeEqualHex(
    createHash("sha256").update(expectedToken, "utf8").digest("hex"),
    createHash("sha256").update(token, "utf8").digest("hex"),
  );
}