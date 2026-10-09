import module from "node:module";
import path from "node:path";

const require = module.createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === "react-native") {
    return {
      Platform: { OS: "android", Version: 33 },
      PermissionsAndroid: {
        PERMISSIONS: {
          POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
          READ_PHONE_STATE: "android.permission.READ_PHONE_STATE",
        },
        RESULTS: { GRANTED: "granted", DENIED: "denied" },
        check: async () => true,
        request: async () => "granted",
      },
    };
  }
  if (request.startsWith("@/") && parent && parent.filename && parent.filename.includes("/mobile/")) {
    const relativePath = request.slice(2);
    const targetPath = path.resolve(import.meta.dirname, "../../mobile", relativePath);
    return originalLoad.call(this, targetPath, parent, isMain);
  }
  if (request === "expo-secure-store" || request === "expo-crypto") {
    return {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
      getRandomBytes: (n) => new Uint8Array(n),
    };
  }
  return originalLoad.apply(this, arguments);
};
