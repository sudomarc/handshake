import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const Module = require("module");

const mockPath = path.join(fileURLToPath(new URL(".", import.meta.url)), "react-native-mock.cjs");
const mobileDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../mobile");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react-native") {
    return mockPath;
  }
  if (
    request.startsWith("@/") &&
    parent &&
    parent.filename &&
    parent.filename.includes("/mobile/")
  ) {
    const relativePath = request.slice(2);
    const resolvedInMobile = path.join(mobileDir, relativePath);
    try {
      return originalResolve.call(this, resolvedInMobile, parent, isMain, options);
    } catch {
      // Fallback
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
