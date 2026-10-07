import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";

const DEVICE_ID_KEY = "handshake_device_id";
const DEVICE_SECRET_KEY = "handshake_device_secret";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The device id is an opaque identifier, not a secret. It exists so the server
 * can tell two devices apart inside one trusted circle (multiple phones per
 * person) and so a single device can be revoked without revoking the person.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const created = toHex(getRandomBytes(16));
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
  return created;
}

/**
 * The device secret is the credential that proves this installation is the
 * device it enrolled as.
 *
 * Generated here on first use and kept in the platform keystore. It is never
 * derived from anything shipped in the APK, and it is deliberately *not* the
 * `pairId`: losing or revoking a device must not hand over the whole circle's
 * membership secret.
 *
 * Regenerating it produces a new device identity, which the server treats as a
 * new enrolment (the old device stays enrolled until revoked).
 */
export async function getDeviceSecret(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_SECRET_KEY);
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const created = toHex(getRandomBytes(32));
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, created);
  return created;
}

export async function clearDeviceIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY);
}

/** New single-use nonce for one authenticated request. */
export function newNonce(): string {
  return toHex(getRandomBytes(16));
}