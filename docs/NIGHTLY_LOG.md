# Nightly Engineering Log

## 2026-10-12

### Phase & Baseline
- **Phase:** ROADMAP MODE (Today's date: 2026-10-12, post Oct 10, 2026 submission deadline).
- **Branch:** `nightly/2026-10-12` created from `main`.
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build` PASSED. `npm run format:check` flagged 78 existing files with formatting warnings.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` PASSED.
  - Plugin: `NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` PASSED (9/9 tests).
  - Root tests: `NODE_PATH=mobile/node_modules npm test` PASSED (142/142 tests).

### Work Selected
- **Focus Area:** Continuous improvement loop — Tests.
- **Task:** Add unit test coverage for `mobile/lib/storage.ts` (`addPair`, `updatePair`, `getAllPairs`, `removePair`, legacy migration, error handling) using a Node module mock for Expo SecureStore (`tests/mocks/register-react-native.ts`).

### Changes
- Created `docs/NIGHTLY_LOG.md`.
- Created `tests/mocks/register-react-native.ts` to mock `expo-secure-store` with an in-memory key-value store for Node unit test runs.
- Created `tests/storage.test.ts` covering all methods in `mobile/lib/storage.ts`.
- Updated root `package.json` `test` script to include `--import ./tests/mocks/register-react-native.ts` and `tests/storage.test.ts`.

### Gates & Verification Results
- `NODE_PATH=mobile/node_modules npm test`: PASSED (all suites passing including `tests/storage.test.ts`).
- Root `npm run lint` & `npm run build`: PASSED.
- Mobile `npm run typecheck` & `npm run lint`: PASSED.
- Plugin tests: PASSED.

### Known Risks & Open Findings
- `lib/trustStore.ts` remains in-memory process-local state (documented serverless limitation).
- Formatting checks on untouched files are not run globally to respect the file/line budget.

### Needs Human
- Physical two-device verification of QR pairing flow on physical Android hardware.

### Plan for Tomorrow
1. Continuous improvement loop: Add unit tests for `mobile/lib/permissions.ts`.
2. Add unit tests for `mobile/lib/callOverlay.ts` / overlay intent bridge.
3. Review dependencies for non-breaking minor/patch security updates (`npm audit`).
