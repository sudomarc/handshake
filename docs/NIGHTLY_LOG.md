# Nightly Engineer Log

## 2026-10-19

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 19, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build` -> PASS.
  - Root `npm test`: 133 root tests PASS, 9 plugin tests PASS.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` -> PASS.
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap Item #1):** "Replace instance-local in-memory trust storage before any production use." Implemented state snapshot serialization (`exportState` and `importState`) and file-backed atomic persistence in `lib/trustStore.ts`.
- **What was changed:**
  - `lib/trustStore.ts`: Added versioned snapshot export/import methods and atomic disk persistence using temporary write-and-rename (`saveToFile`, `loadFromFile`) triggered automatically across all store mutations (`enroll`, `revoke`, `openSession`, `joinSession`, `createInvite`, `acceptInvite`, `confirmInvite`, `sweep`). Configurable via `TRUST_STORE_PATH` env var or options parameter.
  - `tests/trustStorePersistence.test.ts`: Created new unit test suite validating snapshot serialization, file persistence across process restarts, and corrupt/missing file recovery.
  - `package.json`: Added `tests/trustStorePersistence.test.ts` to `npm test` command.

### Verification Gate Summary

- Root `NODE_PATH=$(pwd)/mobile/node_modules npm test`: 136 root unit tests PASS, 9 plugin unit tests PASS (145 total PASS).
- Root `npm run lint && npm run build`: PASS (0 errors / 0 warnings).
- Mobile `cd mobile && npm run typecheck && npm run lint`: PASS (0 errors).
- Native plugin tests: 9/9 PASS.
- Rebuild check: `./gradlew :app:assembleRelease` requires Android SDK environment; workflow `.github/workflows/android-apk.yml` left untouched.

### Known Risks & Open Findings

- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and call verification against multi-instance backend deployments.

### Plan for Tomorrow (Next 3 Tasks)

1. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
2. Enhance mobile hook test coverage for offline trust state fallback.
3. Review and audit shared rate-limit store options for serverless deployments.

---

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
