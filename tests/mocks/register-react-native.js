import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function (request, ...rest) {
  if (request === "react-native") {
    return {
      PermissionsAndroid: {
        PERMISSIONS: {
          POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
          READ_PHONE_STATE: "android.permission.READ_PHONE_STATE",
        },
        RESULTS: {
          GRANTED: "granted",
          DENIED: "denied",
        },
        check: async () => false,
        request: async () => "denied",
      },
      Platform: { OS: "web", Version: 33 },
      NativeModules: {
        HandshakeOverlay: {
          consumeOverlayAction: async () => null,
        },
      },
    };
  }
  return originalLoad.apply(this, [request, ...rest]);
};
