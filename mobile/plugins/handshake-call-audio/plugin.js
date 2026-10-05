const { withAndroidManifest, withGradleProperties, withProjectBuildGradle, withAppBuildGradle, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.sudomarc.handshake';
const NATIVE_DIR = 'plugins/handshake-call-audio/android';

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
  ];

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
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
        'android:foregroundServiceType': 'microphone',
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
    const contents = config.modResults.contents;
    const packageImport = "import com.sudomarc.handshake.callaudio.CallAudioPackage;";
    const packageAdd = "packages.add(new CallAudioPackage());";

    if (!contents.includes(packageImport)) {
      const importIndex = contents.lastIndexOf("import ");
      if (importIndex !== -1) {
        const nextLineIndex = contents.indexOf("\n", importIndex);
        config.modResults.contents =
          contents.slice(0, nextLineIndex + 1) + packageImport + "\n" + contents.slice(nextLineIndex + 1);
      }
    }

    if (!contents.includes(packageAdd)) {
      const packagesIndex = contents.indexOf("packages.add(");
      if (packagesIndex !== -1) {
        const lineEndIndex = contents.indexOf("\n", packagesIndex);
        config.modResults.contents =
          contents.slice(0, lineEndIndex + 1) + "            " + packageAdd + "\n" + contents.slice(lineEndIndex + 1);
      }
    }

    return config;
  });

  return config;
}

module.exports = withCallAudioPlugin;