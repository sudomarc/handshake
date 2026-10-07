import * as Crypto from "expo-crypto";

/** Must match `TRUST_PROTOCOL` in `lib/trustCrypto.ts`. */
export const TRUST_PROTOCOL = "handshake-trust-v1";

/**
 * Client half of the device proof.
 *
 * This mirrors `computeDeviceProof()` in `lib/trustCrypto.ts` exactly:
 *
 *   proof = SHA256("handshake-trust-v1|proof|" + fields... + "|" + deviceSecret)
 *
 * The secret is the *last* field, which is what makes the construction safe
 * against SHA-256 length extension. See `lib/trustCrypto.ts` for why a plain
 * HMAC is not used here (expo-crypto@13 exposes only SHA digests over strings).
 *
 * `EXPO_PUBLIC_*` values reach the client bundle, so no secret may ever appear
 * in these pre-images.
 */
export interface ProofFields {
  pairId: string;
  deviceId: string;
  sessionId: string;
  nonce: string;
  issuedAt: number;
  deviceSecret: string;
}

export function proofPreImage(input: ProofFields): string {
  return [
    TRUST_PROTOCOL,
    "proof",
    input.pairId,
    input.deviceId,
    input.sessionId,
    input.nonce,
    String(input.issuedAt),
    input.deviceSecret,
  ].join("|");
}

export async function computeDeviceProof(input: ProofFields): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    proofPreImage(input),
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest;
}

/**
 * Client-verifiable binding of a confirmed call session.
 *
 * Mirrors `sessionAttestation()` in `lib/trustCrypto.ts`. It depends only on the
 * `pairId`, which this device already holds, so the client can check that the
 * server handed it a real mutual recognition for its own circle rather than
 * taking the server's word for it.
 */
export interface AttestationFields {
  pairId: string;
  sessionId: string;
  initiatorDeviceId: string;
  peerDeviceId: string;
  issuedAt: number;
  expiresAt: number;
}

export async function computeAttestation(input: AttestationFields): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    [
      TRUST_PROTOCOL,
      "attest",
      input.pairId,
      input.sessionId,
      input.initiatorDeviceId,
      input.peerDeviceId,
      String(input.issuedAt),
      String(input.expiresAt),
    ].join("|"),
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

export async function verifyAttestation(
  expected: string,
  input: AttestationFields,
): Promise<boolean> {
  const actual = await computeAttestation(input);
  return actual.length === expected.length && actual === expected;
}