const fs = require("node:fs");
const path = require("node:path");

const gradlePath = path.join(
  __dirname,
  "../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle",
);

if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, "utf8");
  const target = `        release(MavenPublication) {
          from components.release
        }`;
  const replacement = `        def releaseComponent = components.findByName("release") ?: components.findByName("java")
        if (releaseComponent != null) {
          release(MavenPublication) {
            from releaseComponent
          }
        }`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(gradlePath, content, "utf8");
    console.log("[patch-expo-modules-core] Successfully patched ExpoModulesCorePlugin.gradle");
  }
}
