# Nightly Engineer Log

## 2026-10-17

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 17, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build` -> PASS.
  - Root `npm test` -> PASS (137 root unit tests + 9 plugin tests = 146 total tests PASS).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` -> PASS.
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap):** Implemented TrustStore state export/import and atomic file-backed persistence (`lib/trustStore.ts`).
- **What was changed:**
  - `lib/trustStore.ts`: Defined `ExportedTrustStoreState` interface, added `exportState()` and `importState()` methods, added atomic file persistence (`saveToFile`, `loadFromFile`) via `TRUST_STORE_PATH` env var or explicit path parameter, and automatically trigger `persist()` on state mutation operations (`enroll`, `revoke`, `openSession`, `joinSession`, `readSession`, `createInvite`, `acceptInvite`, `confirmInvite`, `sweep`).
  - `tests/trust.test.ts`: Added unit tests covering state export/import roundtrip, file persistence via constructor parameter and `TRUST_STORE_PATH` environment variable, and atomic file cleanup on store `reset()`.
  - `ROADMAP.md`: Marked TrustStore persistence item updated with implementation details.

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (27 static pages generated).
- Root `npm test`: 137 unit tests PASS, 9 plugin unit tests PASS (146 total tests PASS).
- Mobile `cd mobile && npm run typecheck && npm run lint`: PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- File-backed persistence relies on local atomic filesystem writes (`.tmp` + rename); distributed multi-instance serverless hosting (e.g. Vercel multi-region serverless) would require a shared database (e.g., PostgreSQL/Redis).
- Carrier call audio capture remains OS-restricted on non-system Android apps.

### Needs Human

- Physical device verification for multi-device QR pairing and session attestation across server restarts with `TRUST_STORE_PATH` configured.

### Plan for Tomorrow (Next 3 Tasks)

1. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
2. Enhance mobile hook test coverage for offline trust state fallback.
3. Review and refine input validation schemas for rate-limiting headers and session discovery queries.

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
