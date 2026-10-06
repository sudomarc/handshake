import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";

const DEVICE_ID_KEY = "handshake_device_id";

function generateDeviceId(): string {
  const bytes = getRandomBytes(16);
  return Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = generateDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function clearDeviceId(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
}
