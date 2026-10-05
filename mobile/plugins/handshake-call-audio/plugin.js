const { withAndroidManifest, withGradleProperties, withProjectBuildGradle, withAppBuildGradle, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.sudomarc.handshake';
const NATIVE_DIR = 'plugins/handshake-call-audio/android';

const PACKAGE_CLASS = 'CallAudioPackage';
const PACKAGE_IMPORT_PATH = `com.sudomarc.handshake.callaudio.${PACKAGE_CLASS}`;

const ESCAPED_IMPORT_PATH = PACKAGE_IMPORT_PATH.replace(/\./g, '\\.');
const IMPORT_STATEMENT_RE = new RegExp(`^[ \\t]*import[ \\t]+${ESCAPED_IMPORT_PATH}[ \\t]*;?[ \\t]*$`, 'm');
const STRIP_IMPORT_RE = new RegExp(`^[ \\t]*import[ \\t]+${ESCAPED_IMPORT_PATH}[ \\t]*;?[ \\t]*\\r?\\n`, 'gm');
const ADD_LINE_RE = /^[ \t]*packages\.add\([^\n]*$/m;
const IMPORT_LINE_RE = /^[ \t]*import[ \t]+[^\n]*$/gm;
const PACKAGE_LINE_RE = /^[ \t]*package[ \t]+[^\n]*$/m;
const PACKAGE_LIST_RETURN_RE = /^[ \t]*return[ \t]+(?:new[ \t]+)?PackageList\([^\n]*$/m;

const REGISTRATION_INDENT = '            ';

function getNativeSourcePath(relativePath) {
  return path.join(__dirname, 'android', relativePath);
}

function copyNativeFiles() {
  const sourceDir = path.join(__dirname, 'android');
  const targetDir = path.join('android', 'app', 'src', 'main', 'java', 'com', 'sudomarc', 'handshake', 'callaudio');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = [
    'CallAudioModule.kt',
    'CallAudioService.kt',
    'CallScreeningServiceImpl.kt',
    'AudioCaptureManager.kt',
    'VADProcessor.kt',
    'CallAudioPackage.kt',
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
  if (typeof filePath === 'string' && /\.kt$/i.test(filePath)) {
    return true;
  }
  if (typeof filePath === 'string' && /\.java$/i.test(filePath)) {
    return false;
  }
  return /^\s*class\s+MainApplication\s*:\s*Application\s*\(/m.test(contents);
}

function buildImportStatement(isKotlin) {
  return isKotlin ? `import ${PACKAGE_IMPORT_PATH}` : `import ${PACKAGE_IMPORT_PATH};`;
}

function buildRegistration(isKotlin) {
  return isKotlin
    ? `packages.add(${PACKAGE_CLASS}())`
    : `packages.add(new ${PACKAGE_CLASS}());`;
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
  return contents.replace(STRIP_IMPORT_RE, '');
}

// An existing import is only reusable when it sits after the package declaration;
// anything earlier is a corrupt placement produced by an earlier buggy run.
function findReusableImport(contents) {
  const found = IMPORT_STATEMENT_RE.exec(contents);
  const packageLine = PACKAGE_LINE_RE.exec(contents);
  if (!found || !packageLine || found.index < packageLine.index) {
    return null;
  }
  return found;
}

function findReusableRegistration(contents) {
  const found = ADD_LINE_RE.exec(contents);
  const packageLine = PACKAGE_LINE_RE.exec(contents);
  if (!found || !packageLine || found.index < packageLine.index) {
    return null;
  }
  return found;
}

function replaceAt(contents, match, replacement) {
  return contents.slice(0, match.index) + replacement + contents.slice(match.index + match[0].length);
}

// Rewrites a matched line in place, keeping its original indentation and line ending
// so that CRLF sources stay byte-identical and the plugin never reflows the file.
function replaceLineAt(contents, match, statement) {
  const indent = /^[ \t]*/.exec(match[0])[0];
  const eol = /\r?\n?$/.exec(match[0])[0];
  return replaceAt(contents, match, `${indent}${statement}${eol}`);
}

function insertRegistration(contents, statement) {
  const returnLine = PACKAGE_LIST_RETURN_RE.exec(contents);
  if (!returnLine) {
    return null;
  }
  return contents.slice(0, returnLine.index) + `${REGISTRATION_INDENT}${statement}\n` + contents.slice(returnLine.index);
}

function patchMainApplication(contents, { isKotlin }) {
  let out = contents;

  const existingImport = findReusableImport(out);
  if (existingImport) {
    out = replaceAt(out, existingImport, buildImportStatement(isKotlin));
  } else {
    const next = insertImport(stripImports(out), buildImportStatement(isKotlin));
    if (next === null) {
      return out;
    }
    out = next;
  }

  const existingRegistration = findReusableRegistration(out);
  if (existingRegistration) {
    out = replaceLineAt(out, existingRegistration, buildRegistration(isKotlin));
  } else {
    const next = insertRegistration(out, buildRegistration(isKotlin));
    if (next === null) {
      return out;
    }
    out = next;
  }

  return out;
}

function withCallAudioPlugin(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Add permissions
    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.ANSWER_PHONE_CALLS',
    ];

    for (const perm of permissions) {
      if (!manifest.manifest['uses-permission']) {
        manifest.manifest['uses-permission'] = [];
      }
      const exists = manifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    // Add CallScreeningService
    if (!manifest.manifest.application) {
      manifest.manifest.application = [{}];
    }
    if (!manifest.manifest.application[0].service) {
      manifest.manifest.application[0].service = [];
    }

    const callScreeningService = {
      $: {
        'android:name': `${PACKAGE_NAME}.callaudio.CallScreeningServiceImpl`,
        'android:permission': 'android.permission.BIND_SCREENING_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.telecom.CallScreeningService' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.telecom.CALL_SCREENING_SERVICE_UI',
            'android:value': 'false',
          },
        },
      ],
    };

    const audioCaptureService = {
      $: {
        'android:name': `${PACKAGE_NAME}.callaudio.CallAudioService`,
        'android:permission': 'android.permission.BIND_FOREGROUND_SERVICE',
        'android:exported': 'false',
        'android:foregroundServiceType': 'microphone',
      },
    };

    const existingScreening = manifest.manifest.application[0].service.find(
      (s) => s.$ && s.$['android:name'] === `${PACKAGE_NAME}.callaudio.CallScreeningServiceImpl`
    );
    if (!existingScreening) {
      manifest.manifest.application[0].service.push(callScreeningService);
    }

    const existingAudio = manifest.manifest.application[0].service.find(
      (s) => s.$ && s.$['android:name'] === `${PACKAGE_NAME}.callaudio.CallAudioService`
    );
    if (!existingAudio) {
      manifest.manifest.application[0].service.push(audioCaptureService);
    }

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const content = config.modResults.contents;
    if (!content.includes('handshake-call-audio')) {
      // Add any native dependencies if needed
    }
    return config;
  });

  // Copy native files after prebuild
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