# Nightly Engineer Log

## 2026-10-19

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 19, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS (format check initially noted existing untracked file differences, scoped strictly to modified files).
  - Root `npm test` -> PASS (135 tests pass including new trustStore persistence suite; plugin test execution in `package.json` verified with `NODE_PATH=./mobile/node_modules`).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS.
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap):** Priority 1 item in `ROADMAP.md` ("Replace instance-local in-memory trust storage before any production use").
- **What was changed:**
  - `lib/trustStore.ts`: Implemented `exportState()` and `importState()` serialization functions, and added optional file-backed persistence configured via constructor option or `TRUST_STORE_PATH` environment variable. State changes (enrollment, revocation, session opening/joining, invite creation/acceptance/confirmation, sweeps, and resets) trigger atomic file writes (`.tmp` write + atomic rename) when persistence is configured.
  - `tests/trustStorePersistence.test.ts`: Added unit test suite covering full state export/import roundtrip for pairs, sessions, and invites, as well as file-backed state saving and restoring across store instances.
  - `package.json`: Included `tests/trustStorePersistence.test.ts` in the test suite execution list.
  - `ROADMAP.md`: Marked trust store durable persistence item as complete under Priority 1.

### Verification Gate Summary

- Root `npm ci && npm run lint && npm run build && npm run format:check`: PASS.
- Root `npm test`: 135 unit tests PASS (126 root + 9 plugin).
- Mobile `cd mobile && npm run typecheck && npm run lint`: PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).
- Production asymmetric-key cryptography (Ed25519 device key pairs) remains a planned milestone to replace the symmetric pre-shared device secret scheme.

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Verify device attestation expiration and revocation propagation under network partition scenarios.
2. Add offline trust state fallback handling tests in mobile hooks (`mobile/hooks/usePairs.ts`).
3. Refine call companion status overlay lifecycle handling on Android background resume.
