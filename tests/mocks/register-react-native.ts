import module from "node:module";

const store = new Map<string, string>();

export function resetMockSecureStore(): void {
  store.clear();
}

export function getMockSecureStoreState(): Record<string, string> {
  return Object.fromEntries(store.entries());
}

export const mockSecureStore = {
  getItemAsync: async (key: string): Promise<string | null> => {
    return store.has(key) ? store.get(key)! : null;
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    store.delete(key);
  },
  resetMockSecureStore,
  getMockSecureStoreState,
};

const originalRequire = module.Module.prototype.require;

module.Module.prototype.require = function (id: string) {
  if (id === "expo-secure-store") {
    return mockSecureStore;
  }
  if (id === "react-native") {
    return {
      NativeModules: {},
      Platform: { OS: "android" },
    };
  }
  return originalRequire.call(this, id);
};
