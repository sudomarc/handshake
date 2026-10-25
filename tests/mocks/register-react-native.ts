import Module from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const secureStoreMap = new Map<string, string>();

export function resetMockSecureStore() {
  secureStoreMap.clear();
}

export function getMockSecureStoreState() {
  return new Map(secureStoreMap);
}

const mockExpoCrypto = {
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  CryptoEncoding: { HEX: "hex" },
  digestStringAsync: async (_algo: string, str: string) => {
    return crypto.createHash("sha256").update(str).digest("hex");
  },
  getRandomBytes: (count: number) => {
    return crypto.randomBytes(count);
  },
};

const mockExpoSecureStore = {
  getItemAsync: async (key: string) => {
    return secureStoreMap.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string) => {
    secureStoreMap.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    secureStoreMap.delete(key);
  },
};

const mockReactNative = {
  Platform: { OS: "android", select: (objs: Record<string, unknown>) => objs.android },
  NativeModules: {},
};

const targetModule = Module.prototype as unknown as { require: (id: string) => unknown };
const originalRequire = targetModule.require;

targetModule.require = function (this: unknown, id: string) {
  if (id === "expo-crypto") return mockExpoCrypto;
  if (id === "expo-secure-store") return mockExpoSecureStore;
  if (id === "react-native") return mockReactNative;
  if (id.startsWith("@/")) {
    const mobileResolved = path.resolve(__dirname, "../../mobile", id.slice(2));
    if (
      fs.existsSync(mobileResolved) ||
      fs.existsSync(`${mobileResolved}.ts`) ||
      fs.existsSync(`${mobileResolved}.tsx`) ||
      fs.existsSync(`${mobileResolved}/index.ts`)
    ) {
      return originalRequire.call(this, mobileResolved);
    }
  }
  return originalRequire.call(this, id);
};
