const {
  withAndroidManifest,
  withGradleProperties,
  withProjectBuildGradle,
  withAppBuildGradle,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.sudomarc.handshake";
const NATIVE_DIR = "plugins/handshake-call-audio/android";

const PACKAGE_CLASS = "CallAudioPackage";
const PACKAGE_IMPORT_PATH = `com.sudomarc.handshake.callaudio.${PACKAGE_CLASS}`;

const ESCAPED_IMPORT_PATH = PACKAGE_IMPORT_PATH.replace(/\./g, "\\.");
const IMPORT_STATEMENT_RE = new RegExp(
  `^[ \\t]*import[ \\t]+${ESCAPED_IMPORT_PATH}[ \\t]*;?[ \\t]*$`,
  "m",
);
const STRIP_IMPORT_RE = new RegExp(
  `^[ \\t]*import[ \\t]+${ESCAPED_IMPORT_PATH}[ \\t]*;?[ \\t]*\\r?\\n`,
  "gm",
);
const IMPORT_LINE_RE = /^[ \t]*import[ \t]+[^\n]*$/gm;
const PACKAGE_LINE_RE = /^[ \t]*package[ \t]+[^\n]*$/m;

const KOTLIN_REGISTRATION_RE =
  /return\s+PackageList\(this\)\.packages\s*\+\s*CallAudioPackage\(\)/m;
const KOTLIN_RETURN_RE = /([ \t]*)return\s+PackageList\(this\)\.packages/m;
const KOTLIN_BROKEN_ADD_RE = /^[ \t]*packages\.add\((?:new\s+)?CallAudioPackage\(\)\);?\r?\n?/gm;

const JAVA_ADD_RE = /^[ \t]*packages\.add\(new\s+CallAudioPackage\(\)\);?$/m;
const JAVA_RETURN_RE = /^[ \t]*return[ \t]+(?:new[ \t]+)?PackageList\([^\n]*$/m;

const REGISTRATION_INDENT = "            ";

function getNativeSourcePath(relativePath) {
  return path.join(__dirname, "android", relativePath);
}

function copyNativeFiles() {
  const sourceDir = path.join(__dirname, "android");
  const targetDir = path.join(
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "sudomarc",
    "handshake",
    "callaudio",
  );

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = [
    "CallScreeningServiceImpl.kt",
    "CallAudioPackage.kt",
    "HandshakeOverlayModule.kt",
    "HandshakeOverlayService.kt",
  ];

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function isKotlinSource(contents, filePath) {
  if (typeof filePath === "string" && /\.kt$/i.test(filePath)) {
    return true;
  }
  if (typeof filePath === "string" && /\.java$/i.test(filePath)) {
    return false;
  }
  return /^\s*class\s+MainApplication\s*:\s*Application\s*\(/m.test(contents);
}

function buildImportStatement(isKotlin) {
  return isKotlin ? `import ${PACKAGE_IMPORT_PATH}` : `import ${PACKAGE_IMPORT_PATH};`;
}

function insertImport(contents, statement) {
  const importLines = [...contents.matchAll(IMPORT_LINE_RE)];
  if (importLines.length > 0) {
    const last = importLines[importLines.length - 1];
    const at = last.index + last[0].length;
    return contents.slice(0, at) + `\n${statement}` + contents.slice(at);
  }

  const packageLine = PACKAGE_LINE_RE.exec(contents);
  if (!packageLine) {
    return null;
  }
  const at = packageLine.index + packageLine[0].length;
  return contents.slice(0, at) + `\n\n${statement}` + contents.slice(at);
}

function stripImports(contents) {
  return contents.replace(STRIP_IMPORT_RE, "");
}

function findReusableImport(contents) {
  const found = IMPORT_STATEMENT_RE.exec(contents);
  const packageLine = PACKAGE_LINE_RE.exec(contents);
  if (!found || !packageLine || found.index < packageLine.index) {
    return null;
  }
  return found;
}

function replaceAt(contents, match, replacement) {
  return (
    contents.slice(0, match.index) + replacement + contents.slice(match.index + match[0].length)
  );
}

function patchMainApplication(contents, { isKotlin }) {
  let out = contents;

  const existingImport = findReusableImport(out);
  if (existingImport) {
    out = replaceAt(out, existingImport, buildImportStatement(isKotlin));
  } else {
    const next = insertImport(stripImports(out), buildImportStatement(isKotlin));
    if (next !== null) {
      out = next;
    }
  }

  if (isKotlin) {
    out = out.replace(KOTLIN_BROKEN_ADD_RE, "");

    if (!KOTLIN_REGISTRATION_RE.test(out)) {
      const returnMatch = KOTLIN_RETURN_RE.exec(out);
      if (returnMatch) {
        out = replaceAt(
          out,
          returnMatch,
          `${returnMatch[1]}return PackageList(this).packages + ${PACKAGE_CLASS}()`,
        );
      }
    }
  } else {
    const existingRegistration = JAVA_ADD_RE.exec(out);
    if (!existingRegistration) {
      const returnLine = JAVA_RETURN_RE.exec(out);
      if (returnLine) {
        out =
          out.slice(0, returnLine.index) +
          `${REGISTRATION_INDENT}packages.add(new ${PACKAGE_CLASS}());\n` +
          out.slice(returnLine.index);
      }
    }
  }

  return out;
}

function withCallAudioPlugin(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    const permissions = [
      "android.permission.READ_PHONE_STATE",
      "android.permission.READ_CALL_LOG",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    ];

    for (const perm of permissions) {
      if (!manifest.manifest["uses-permission"]) {
        manifest.manifest["uses-permission"] = [];
      }
      const exists = manifest.manifest["uses-permission"].some((p) => p.$["android:name"] === perm);
      if (!exists) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": perm } });
      }
    }

    if (!manifest.manifest.application) {
      manifest.manifest.application = [{}];
    }
    if (!manifest.manifest.application[0].service) {
      manifest.manifest.application[0].service = [];
    }

    const callScreeningService = {
      $: {
        "android:name": `${PACKAGE_NAME}.callaudio.CallScreeningServiceImpl`,
        "android:permission": "android.permission.BIND_SCREENING_SERVICE",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.telecom.CallScreeningService" } }],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.telecom.CALL_SCREENING_SERVICE_UI",
            "android:value": "false",
          },
        },
      ],
    };

    const overlayService = {
      $: {
        "android:name": `${PACKAGE_NAME}.callaudio.HandshakeOverlayService`,
        "android:exported": "false",
        "android:foregroundServiceType": "specialUse",
      },
      property: [
        {
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value": "User-enabled Handshake warning overlay shown above phone and calling apps",
          },
        },
      ],
    };

    const existingScreening = manifest.manifest.application[0].service.find(
      (s) => s.$ && s.$["android:name"] === `${PACKAGE_NAME}.callaudio.CallScreeningServiceImpl`,
    );
    if (!existingScreening) {
      manifest.manifest.application[0].service.push(callScreeningService);
    }

    const existingOverlay = manifest.manifest.application[0].service.find(
      (s) => s.$ && s.$["android:name"] === `${PACKAGE_NAME}.callaudio.HandshakeOverlayService`,
    );
    if (!existingOverlay) {
      manifest.manifest.application[0].service.push(overlayService);
    }

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    return config;
  });

  config = withProjectBuildGradle(config, (config) => {
    copyNativeFiles();
    return config;
  });

  config = withMainApplication(config, (config) => {
    const isKotlin = isKotlinSource(config.modResults.contents, config.modResults.path);
    config.modResults.contents = patchMainApplication(config.modResults.contents, { isKotlin });
    return config;
  });

  return config;
}

module.exports = withCallAudioPlugin;
module.exports.patchMainApplication = patchMainApplication;
module.exports.isKotlinSource = isKotlinSource;
