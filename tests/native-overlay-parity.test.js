const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const pairs = [
  [
    "CallAudioPackage.kt",
    path.join(
      repoRoot,
      "mobile",
      "plugins",
      "handshake-call-audio",
      "android",
      "CallAudioPackage.kt",
    ),
    path.join(
      repoRoot,
      "mobile",
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "sudomarc",
      "handshake",
      "callaudio",
      "CallAudioPackage.kt",
    ),
  ],
  [
    "HandshakeOverlayModule.kt",
    path.join(
      repoRoot,
      "mobile",
      "plugins",
      "handshake-call-audio",
      "android",
      "HandshakeOverlayModule.kt",
    ),
    path.join(
      repoRoot,
      "mobile",
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "sudomarc",
      "handshake",
      "callaudio",
      "HandshakeOverlayModule.kt",
    ),
  ],
  [
    "HandshakeOverlayService.kt",
    path.join(
      repoRoot,
      "mobile",
      "plugins",
      "handshake-call-audio",
      "android",
      "HandshakeOverlayService.kt",
    ),
    path.join(
      repoRoot,
      "mobile",
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "sudomarc",
      "handshake",
      "callaudio",
      "HandshakeOverlayService.kt",
    ),
  ],
];

test("native overlay source and generated copies are byte-for-byte identical", () => {
  for (const [name, source, generated] of pairs) {
    assert.equal(fs.existsSync(source), true, `missing plugin source: ${name}`);
    assert.equal(fs.existsSync(generated), true, `missing generated Android file: ${name}`);

    const sourceBytes = fs.readFileSync(source);
    const generatedBytes = fs.readFileSync(generated);

    assert.deepEqual(
      generatedBytes,
      sourceBytes,
      `native overlay drift detected for ${name}`,
    );
  }
});
