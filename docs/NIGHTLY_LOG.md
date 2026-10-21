# Nightly Engineer Log

## 2026-10-22 (Distributed Redis Rate Limiting & Async Consumption)

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 22, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS (lint and build pass).
  - Root `npm test` -> 148 root unit tests PASS, 9 plugin unit tests PASS (157 total tests PASS).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS (typecheck and lint pass).
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap) & Priority Level 4 (Prepare for production):** Implemented distributed rate limiting Redis store adapter (`RedisRateLimiterStore`), atomic REST rate token consumption (`INCR` + `EXPIRE`), and async consumption (`consumeAsync`) for API routes (`ROADMAP.md` Priority 4: "Review authentication, rate limiting, abuse handling and operational monitoring").
- **What was changed:**
  - `lib/rateLimit.ts`:
    - Defined `AsyncRateLimiterStore` interface (`getAsync`, `setAsync`, `deleteAsync`, `clearAsync`, `consumeAsync`).
    - Implemented `RedisRateLimiterStore` implementing both `RateLimiterStore` and `AsyncRateLimiterStore` interfaces with atomic Redis REST increment/expire logic and graceful fallback to local memory store.
    - Updated `consumeAsync()` function to seamlessly handle synchronous and asynchronous rate limiter stores.
    - Configured auto-store selection checking `RATE_LIMIT_REDIS_URL` or `REDIS_URL`, then `RATE_LIMIT_STORE_PATH`, defaulting to `MemoryRateLimiterStore`.
  - `app/api/*`: Updated all API route handlers (`analyze`, `challenge`, `code/verify`, `trust/enroll`, `trust/invite/accept`, `trust/invite/confirm`, `trust/invite`, `trust/revoke`, `trust/session`) to use `await consumeAsync()`.
  - `tests/rateLimit.test.ts`:
    - Added comprehensive unit tests for `RedisRateLimiterStore` using mock REST fetch, testing `getAsync`, `setAsync`, `deleteAsync`, `clearAsync`, `consumeAsync`, network error fallback, and environment configuration (`RATE_LIMIT_REDIS_URL`).

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (0 errors / warnings).
- Root `npm test`: 148 root unit tests PASS, 9 plugin unit tests PASS (157 total tests PASS).
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier on touched files (`lib/rateLimit.ts`, `tests/rateLimit.test.ts`, `docs/NIGHTLY_LOG.md`, `app/api/*`): PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- When no `RATE_LIMIT_REDIS_URL` or `RATE_LIMIT_STORE_PATH` is configured, rate limiting defaults to process-local memory.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios (`ROADMAP.md` Priority 4).
2. Enhance mobile hook test coverage for offline trust state fallback (`ROADMAP.md` Priority 2).
3. Review authentication headers and error messaging across API endpoints (`ROADMAP.md` Priority 4).

## 2026-10-21 (Run 2: CallSessionStore Persistence)

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 21, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS (lint and build pass).
  - Root `npm test` -> 141 root tests PASS, 9 plugin tests PASS (150 total tests PASS).
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS (typecheck and lint pass).
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap) & Priority Level 4 (Prepare for production):** Implemented state export/import (`exportState`, `importState`), automated cleanup persistence, and atomic file-backed persistence for `CallSessionStore` (`ROADMAP.md` Priority 4: "Prepare for production: Introduce durable shared storage").
- **What was changed:**
  - `lib/callStore.ts`:
    - Defined and exported `CallSessionStoreState` interface for typed call session state serialization.
    - Exported `CallSessionStore` class alongside singleton instance `callSessionStore`.
    - Implemented `exportState()` and `importState()` methods for `CallSession` map serialization and rehydration.
    - Added atomic file-backed persistence configured via constructor `filePath` argument or `CALL_STORE_PATH` environment variable.
    - Added atomic write mechanism (temp file write followed by `renameSync`) on state mutations (`createSession`, `setOffer`, `setAnswer`, `addIceCandidate`, `endSession`, `cleanup`, `reset`).
  - `tests/lib.test.ts`:
    - Added unit tests for `CallSessionStore` covering `exportState` / `importState`, atomic file-backed persistence, and `CALL_STORE_PATH` env var persistence.

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (0 errors / warnings).
- Root `npm test`: 144 root unit tests PASS, 9 plugin unit tests PASS (153 total tests PASS).
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier on touched files (`lib/callStore.ts`, `tests/lib.test.ts`, `docs/NIGHTLY_LOG.md`): PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Default call session setup without `CALL_STORE_PATH` or custom store adapter uses process-local memory on serverless environments.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Implement distributed rate limiting Redis store adapter / multi-instance sync for `lib/rateLimit.ts` (`ROADMAP.md` Priority 4).
2. Validate and refine device-key attestation expiration and revocation behavior under network partition scenarios.
3. Enhance mobile hook test coverage for offline trust state fallback.

## 2026-10-21

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 21, 2026, after Oct 10, 2026 submission cutoff).
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

## 2026-10-20

### Phase & Baseline Status

- **Phase:** Roadmap Mode (Current date: Oct 20, 2026, after Oct 10, 2026 submission cutoff).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build && npm run format:check` -> PASS (lint and build pass).
  - Root `npm test` -> 136 root tests PASS, 9 plugin tests PASS.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check` -> PASS (typecheck and lint pass).
  - Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> 9/9 PASS.

### Priority Level & Work Undertaken

- **Priority Level 2 (Roadmap):** Implemented state export/import and atomic file-backed persistence for `TrustStore` (`ROADMAP.md` Priority 1: "Replace instance-local in-memory trust storage before any production use").
- **What was changed:**
  - `lib/trustStore.ts`:
    - Added `TrustStoreState` interface for typed state serialization.
    - Exported `TrustStore` class alongside singleton instance `trustStore`.
    - Implemented `exportState()` and `importState()` methods supporting rehydration of `Map` and `Set` structures (`usedNonces`).
    - Implemented atomic file-backed persistence configured via constructor `filePath` argument or `TRUST_STORE_PATH` environment variable.
    - Added atomic write mechanism (temp file write followed by `renameSync`) on state mutations (`enroll`, `revoke`, `openSession`, `joinSession`, `createInvite`, `acceptInvite`, `confirmInvite`, `sweep`, `reset`).
  - `tests/trust.test.ts`:
    - Added comprehensive unit tests for `exportState` / `importState`, atomic file-backed persistence, and `TRUST_STORE_PATH` env var persistence.

### Verification Gate Summary

- Root `npm run lint && npm run build`: PASS (0 errors / warnings).
- Root `npm test`: 136 root unit tests PASS, 9 plugin unit tests PASS (145 total tests PASS).
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier on touched files (`lib/trustStore.ts`, `tests/trust.test.ts`, `docs/NIGHTLY_LOG.md`): PASS.
- Rebuild check (`./gradlew :app:assembleRelease`): Requires full Android SDK environment; Android release CI build workflow (`.github/workflows/android-apk.yml`) remains untouched.

### Known Risks & Open Findings

- Production serverless deployments using multiple stateless container instances without persistent volume mounts or env `TRUST_STORE_PATH` pointing to shared storage will continue using process-local memory.
- Remote carrier call audio and WhatsApp call audio remain inaccessible due to Android OS security boundaries (`CAPTURE_AUDIO_OUTPUT` permission constraint).

### Needs Human

- Physical device testing on two phones for QR pairing and live call overlay behavior against the deployed backend.

### Plan for Tomorrow (Next 3 Tasks)

1. Implement distributed rate limiting or shared Redis store adapter interface for `lib/rateLimit.ts` (`ROADMAP.md` Priority 4).
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
- Mobile `npm run typecheck && npm run lint`: PASS.
- Prettier format check on touched files: PASS.
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
