# Nightly Engineer Log

## 2026-10-21

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS.
  - Root `npm test` -> 148 root unit tests PASS, 9 plugin unit tests PASS (157 total tests PASS).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` -> PASS.
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap) & Priority Level 4 (Prepare for production):** Implemented state serialization (`exportState`, `importState`) and atomic file-backed persistence for `CallSessionStore` (`ROADMAP.md` Priority 4: "Introduce durable shared storage").
- **What was changed:**
  - `lib/callStore.ts`:
    - Defined `CallSessionStoreState` interface for typed state serialization.
    - Exported `CallSessionStore` class alongside singleton instance `callSessionStore`.
    - Implemented `exportState()` and `importState()` methods for WebRTC call signaling sessions and ICE candidates.
    - Implemented atomic file-backed persistence configured via constructor or `CALL_STORE_PATH` environment variable.
    - Implemented automated disk rehydration on initialization and atomic file writes on state mutations (`createSession`, `setOffer`, `setAnswer`, `addIceCandidate`, `endSession`, `cleanup`, `reset`).
    - Added `reset()` helper method.
  - `tests/callStore.test.ts`:
    - Added unit tests covering session creation, WebRTC offer/answer/ICE candidate handling, state export/import serialization, stale session cleanup, and atomic file-backed persistence rehydration.
  - `package.json`:
    - Registered `tests/callStore.test.ts` in root `"test"` npm script.

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (0 errors / warnings).
- Root `npm test`: 148 root unit tests PASS, 9 plugin unit tests PASS (157 total tests PASS).
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier on touched files (`lib/callStore.ts`, `tests/callStore.test.ts`, `package.json`, `docs/NIGHTLY_LOG.md`): PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Production serverless deployments running multiple stateless container instances without persistent volume mounts or env `CALL_STORE_PATH` pointing to shared storage will continue using process-local memory.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for WebRTC signaling and call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Implement distributed rate limiting Redis store adapter / multi-instance sync for `lib/rateLimit.ts` (`ROADMAP.md` Priority 4).
2. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
3. Enhance mobile hook test coverage for offline trust state fallback.

## 2026-10-20

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 20, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS (lint and build pass).
  - Root `npm test` -> 141 root tests PASS, 9 plugin tests PASS (150 total tests PASS).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS (typecheck and lint pass).
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap) & Priority Level 4 (Prepare for production):** Implemented pluggable store interface `RateLimiterStore`, `MemoryRateLimiterStore`, `FileBackedRateLimiterStore`, and state serialization (`exportRateLimitState`, `importRateLimitState`) for rate limiting (`ROADMAP.md` Priority 4: "Review authentication, rate limiting, abuse handling and operational monitoring").
- **What was changed:**
  - `lib/rateLimit.ts`:
    - Defined `Bucket` type and `RateLimiterStore` interface (`get`, `set`, `delete`, `clear`, `entries`, `size`, `sweep`).
    - Implemented `MemoryRateLimiterStore` with capacity limit (`MAX_BUCKETS = 10_000`) and automatic expired key cleanup.
    - Implemented `FileBackedRateLimiterStore` supporting atomic file-backed persistence configured via constructor or `RATE_LIMIT_STORE_PATH` environment variable.
    - Added `getRateLimiterStore()`, `setRateLimiterStore()`, `exportRateLimitState()`, and `importRateLimitState()`.
    - Retained 100% backward compatibility for `consume()` and `resetRateLimits()`.
  - `tests/rateLimit.test.ts`:
    - Added comprehensive unit tests covering fixed-window rate limiting, bucket capacity limits, automatic sweeping, store state serialization, file-backed atomic persistence, and `RATE_LIMIT_STORE_PATH` env var configuration.
  - `package.json`:
    - Registered `tests/rateLimit.test.ts` in root `"test"` script.

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (0 errors / warnings).
- Root `npm test`: 141 root unit tests PASS, 9 plugin unit tests PASS (150 total tests PASS).
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier on touched files (`lib/rateLimit.ts`, `tests/rateLimit.test.ts`, `package.json`, `docs/NIGHTLY_LOG.md`, `ROADMAP.md`): PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Default rate limiting setup without `RATE_LIMIT_STORE_PATH` or custom store adapter uses process-local memory on serverless environments.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Implement distributed rate limiting Redis store adapter / multi-instance sync for `lib/rateLimit.ts` (`ROADMAP.md` Priority 4).
2. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
3. Enhance mobile hook test coverage for offline trust state fallback.

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
