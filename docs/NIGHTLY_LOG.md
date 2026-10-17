# Nightly Engineer Log

## 2026-10-17

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 17, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build` -> PASS.
  - Root `npm test`: 133 root unit tests PASS, 9 plugin unit tests PASS.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` -> PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap):** Implemented durable atomic file-backed persistence and state export/import for `TrustStore` (`ROADMAP.md` Section 1: "Replace instance-local in-memory trust storage before any production use").
- **What was changed:**
  - `lib/trustStore.ts`: Implemented `exportState()` and `importState()` methods to serialize/deserialize enrolled devices, active call sessions (converting `usedNonces` `Set` to `Array` and back), and QR invitations. Added support for file-backed atomic persistence configured via constructor `persistPath` or `TRUST_STORE_PATH` environment variable using temporary file writes and atomic `fs.renameSync`.
  - `tests/trust.test.ts`: Added unit tests verifying `exportState`/`importState` roundtrip integrity, nonce replay prevention after state restoration, and multi-instance atomic file persistence.

### Verification Gate Summary

- Root `npm test`: 135 root unit tests PASS, 9 plugin unit tests PASS (144 total tests PASS).
- Root `npm run lint && npm run build`: PASS (0 warnings / errors).
- Mobile `cd mobile && npm run typecheck && npm run lint`: PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- File-backed atomic persistence is ideal for single-instance container deployments or persistent file paths (`TRUST_STORE_PATH`). Multi-node serverless clusters across ephemeral disk environments still require a distributed datastore (Redis/Postgres) for cross-node state sync.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Validate and refine device-key attestation expiration and revocation behavior under simulated network partition scenarios.
2. Enhance mobile hook test coverage for offline trust state fallback.
3. Review and refine session cleanup/eviction heuristics under high load.

## 2026-10-14

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 14, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS.
  - Root `npm test` -> Initially FAILED on plugin test step due to missing `NODE_PATH` for `@expo/config-plugins`. Fixed as task #1.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS.
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 1 (Broken things):** Root `npm test` failed out-of-the-box because `node --test mobile/plugins/handshake-call-audio/plugin.test.js` did not set `NODE_PATH`, resulting in `Cannot find module '@expo/config-plugins'`.
- **What was changed:**
  - `package.json`: Updated `"test"` script to include `NODE_PATH=./mobile/node_modules` before running `node --test mobile/plugins/handshake-call-audio/plugin.test.js`.
  - Added `docs/NIGHTLY_LOG.md` formatted with Prettier.

### Verification Gate Summary

- Root `npm ci && npm run lint && npm run build && npm run format:check`: PASS (0 warnings / errors).
- Root `npm test`: 133 root unit tests PASS, 9 plugin unit tests PASS (142 total tests PASS).
- Mobile `npm run typecheck && npm run lint && npm run format:check`: PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Trust state persistence (`lib/trustStore.ts`) remains process-local in-memory storage; multi-instance serverless deployments require shared durable persistence (Priority 1 item on ROADMAP.md).
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Implement durable shared persistence for trust enrollments and sessions (`ROADMAP.md` Priority 1).
2. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
3. Enhance mobile hook test coverage for offline trust state fallback.
