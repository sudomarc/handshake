import Module from "node:module";

const store = new Map<string, string>();

const mockSecureStore = {
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    store.delete(key);
  },
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  deleteItem: (key: string) => {
    store.delete(key);
  },
  _clearMockStore: () => {
    store.clear();
  },
};

type LoadFn = (request: string, parent: unknown, isMain: boolean) => unknown;

const originalLoad = (Module as unknown as { _load: LoadFn })._load;

(Module as unknown as { _load: LoadFn })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === "expo-secure-store") {
    return mockSecureStore;
  }
  if (request === "react-native") {
    return {
      Platform: {
        OS: "android",
        select: (obj: Record<string, unknown>) => obj.android || obj.default,
      },
      NativeModules: {},
    };
  }
  if (request === "expo-crypto") {
    return {
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
    };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

export { mockSecureStore };
