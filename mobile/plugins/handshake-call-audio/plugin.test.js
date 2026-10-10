const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { patchMainApplication, isKotlinSource } = require("./plugin");

const KOTLIN_IMPORT = "import com.sudomarc.handshake.callaudio.CallAudioPackage";
const KOTLIN_ADD = "PackageList(this).packages + CallAudioPackage()";
const JAVA_IMPORT = "import com.sudomarc.handshake.callaudio.CallAudioPackage;";
const JAVA_ADD = "packages.add(new CallAudioPackage());";

// Pristine Expo SDK 51 template shape: the only packages.add( occurrence is inside
// a comment, so a naive indexOf-based injection lands in the wrong place.
const PRISTINE_KOTLIN_TEMPLATE = `package com.sudomarc.handshake

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultReactNativeHost
import com.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            // Packages that cannot be autolinked yet can be added manually here, for example:
            return PackageList(this).packages
          }
      }
  )
}
`;

const PRISTINE_JAVA_TEMPLATE = `package com.sudomarc.handshake;

import android.app.Application;
import com.facebook.react.PackageList;

public class MainApplication extends Application implements ReactApplication {

  @Override
  protected List<ReactPackage> getPackages() {
    // Packages that cannot be autolinked yet can be added manually here, for example:
    return new PackageList(this).getPackages();
  }
}
`;

test("detects Kotlin from file extension and content", () => {
  assert.strictEqual(isKotlinSource(PRISTINE_KOTLIN_TEMPLATE, "/x/MainApplication.kt"), true);
  assert.strictEqual(isKotlinSource(PRISTINE_KOTLIN_TEMPLATE, undefined), true);
  assert.strictEqual(isKotlinSource(PRISTINE_JAVA_TEMPLATE, "/x/MainApplication.java"), false);
  assert.strictEqual(isKotlinSource(PRISTINE_JAVA_TEMPLATE, undefined), false);
});

test("injects valid Kotlin into a pristine Kotlin template", () => {
  const out = patchMainApplication(PRISTINE_KOTLIN_TEMPLATE, { isKotlin: true });

  assert.ok(out.includes(KOTLIN_IMPORT), "Kotlin import missing");
  assert.ok(out.includes(KOTLIN_ADD), "Kotlin registration missing");

  assert.strictEqual(out.includes("new CallAudioPackage"), false, "Java syntax leaked into Kotlin");
  assert.strictEqual(out.includes(JAVA_IMPORT), false, "Java import leaked into Kotlin");

  assert.strictEqual(
    out.trimStart().startsWith("package com.sudomarc.handshake"),
    true,
    "import was injected before the package declaration",
  );

  const importCount = out.match(new RegExp(KOTLIN_IMPORT.replace(/\./g, "\\."), "g")).length;
  assert.strictEqual(importCount, 1, `expected 1 import, got ${importCount}`);

  assert.ok(
    out.includes("PackageList(this).packages + CallAudioPackage()"),
    "expected PackageList(this).packages + CallAudioPackage()",
  );
});

test("registration forms valid Kotlin package list return statement", () => {
  const out = patchMainApplication(PRISTINE_KOTLIN_TEMPLATE, { isKotlin: true });
  assert.ok(
    out.includes("return PackageList(this).packages + CallAudioPackage()"),
    "registration must attach to PackageList return",
  );
});

test("emits Java syntax for a Java MainApplication", () => {
  const out = patchMainApplication(PRISTINE_JAVA_TEMPLATE, { isKotlin: false });
  assert.ok(out.includes(JAVA_IMPORT), "Java import missing");
  assert.ok(out.includes(JAVA_ADD), "Java registration missing");
  assert.strictEqual(
    out.trimStart().startsWith("package com.sudomarc.handshake;"),
    true,
    "import was injected before the package declaration",
  );
});

test("is idempotent across repeated runs", () => {
  for (const template of [PRISTINE_KOTLIN_TEMPLATE, PRISTINE_JAVA_TEMPLATE]) {
    const isKotlin = isKotlinSource(template, undefined);
    const once = patchMainApplication(template, { isKotlin });
    const twice = patchMainApplication(once, { isKotlin });
    const thrice = patchMainApplication(twice, { isKotlin });
    assert.strictEqual(twice, once, "second run changed the output");
    assert.strictEqual(thrice, once, "third run changed the output");
  }
});

test("repairs the previously broken half-patched state", () => {
  const broken =
    JAVA_IMPORT +
    "\n" +
    PRISTINE_KOTLIN_TEMPLATE.replace(
      "return PackageList(this).packages",
      "packages.add(CallAudioPackage())\n            return PackageList(this).packages",
    );
  const out = patchMainApplication(broken, { isKotlin: true });
  assert.strictEqual(
    out.includes("packages.add(CallAudioPackage())"),
    false,
    "Broken packages.add syntax survived repair",
  );
  assert.strictEqual(out.includes(KOTLIN_ADD), true, "Kotlin registration not added");
});

test("is a no-op on the already-correct committed MainApplication.kt", () => {
  const committed = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "sudomarc",
      "handshake",
      "MainApplication.kt",
    ),
    "utf8",
  );
  assert.ok(committed.includes(KOTLIN_ADD), "committed file should already be correct");
  assert.strictEqual(committed.includes("new CallAudioPackage"), false);

  const out = patchMainApplication(committed, { isKotlin: true });
  assert.strictEqual(out, committed, "plugin must not rewrite an already-correct file");
});

// The CI APK workflows (android-apk.yml, android-qa-apk.yml) build the checked-in
// `mobile/android/...` sources directly and do NOT run `expo prebuild`, so the
// packaged copies are what actually ships. If the plugin source-of-truth copies
// drift from the packaged copies, the shipped APK silently loses features that
// only exist in the plugin sources (this happened in b8b1bde, where the honest
// overlay states never reached the packaged module/service). This test is the
// non-regression guard: keep both copies byte-identical (modulo line endings).
test("packaged Kotlin copies stay in sync with the plugin sources", () => {
  const normalize = (s) => s.replace(/\r\n/g, "\n");

  const pluginDir = path.join(__dirname, "android");
  const packagedDir = path.join(
    __dirname,
    "..",
    "..",
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

  const pluginFiles = fs
    .readdirSync(pluginDir)
    .filter((f) => f.endsWith(".kt"))
    .sort();

  assert.ok(pluginFiles.length > 0, "no plugin Kotlin sources found");

  for (const file of pluginFiles) {
    const packagedPath = path.join(packagedDir, file);
    assert.ok(
      fs.existsSync(packagedPath),
      `packaged copy missing for ${file}; the CI build compiles the packaged sources, so it must exist`,
    );

    const source = normalize(fs.readFileSync(path.join(pluginDir, file), "utf8"));
    const packaged = normalize(fs.readFileSync(packagedPath, "utf8"));

    assert.strictEqual(
      packaged,
      source,
      `${file} has drifted between the plugin source-of-truth and the packaged copy that CI builds. ` +
        `Copy the plugin version into mobile/android/.../callaudio/ (the plugin copy is canonical).`,
    );
  }

  // And the reverse: no packaged-only Kotlin file that the plugin does not know
  // about, otherwise `expo prebuild` would delete/lose it.
  const packagedOnly = fs
    .readdirSync(packagedDir)
    .filter((f) => f.endsWith(".kt") && !pluginFiles.includes(f));
  assert.deepStrictEqual(
    packagedOnly,
    [],
    "packaged Kotlin files with no plugin counterpart (prebuild would drop them)",
  );
});

test("uses the documented Android AudioManager recording-configurations API", () => {
  const probe = fs.readFileSync(path.join(__dirname, "android", "AudioSourceProbe.kt"), "utf8");
  assert.ok(probe.includes("audioManager.activeRecordingConfigurations"));
  assert.strictEqual(probe.includes("audioManager.activeRecordingConfigs"), false);
});
