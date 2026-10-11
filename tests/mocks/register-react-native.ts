import Module from "node:module";
import crypto from "node:crypto";

const store = new Map<string, string>();

interface NodeModuleWithLoad {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
}

const moduleWithLoad = Module as unknown as NodeModuleWithLoad;
const originalLoad = moduleWithLoad._load;

moduleWithLoad._load = function (request: string, parent: unknown, isMain: boolean): unknown {
  if (request === "react-native" || request.startsWith("react-native/")) {
    return {
      AppState: {
        currentState: "active",
        addEventListener: () => ({ remove: () => {} }),
      },
      Platform: { OS: "android" },
      NativeModules: {},
    };
  }
  if (request === "expo-crypto") {
    return {
      CryptoDigestAlgorithm: { SHA256: "SHA-256" },
      CryptoEncoding: { HEX: "hex" },
      digestStringAsync: async (_algo: string, str: string) => {
        return crypto.createHash("sha256").update(str).digest("hex");
      },
      getRandomBytes: (count: number) => crypto.randomBytes(count),
    };
  }
  if (request === "expo-secure-store") {
    return {
      getItemAsync: async (key: string) => store.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        store.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        store.delete(key);
      },
    };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};
