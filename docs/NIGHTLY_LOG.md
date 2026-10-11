# Nightly Log

## 2026-10-11

### Phase & Baseline Status

- **Date:** 2026-10-11 (UTC)
- **Phase:** ROADMAP MODE (Post-submission stabilization & continuous improvement loop)
- **Baseline Status:** PASSing after standardizing root test environment (`NODE_PATH=mobile/node_modules`).

### Priority Level & Work Focus

- **Priority 1 (Broken things) & Priority 4 (Continuous improvement loop - DX & Testing):**
  - Standardized root `npm test` so that running `npm test` from root succeeds out-of-the-box without requiring an external `NODE_PATH=mobile/node_modules` environment variable for `@expo/config-plugins` resolution.
  - Added unit test coverage for `lib/trustSchemas.ts` (Zod schemas for device enrollment, QR pairing invitations, call sessions, circle status queries, and device revocation).

### Changes Made

- `package.json`: Updated `test` script to prepend `NODE_PATH=mobile/node_modules` to the plugin test command and registered `tests/trustSchemas.test.ts`.
- `tests/trustSchemas.test.ts`: Created unit tests covering basic types, enrollment, pairing invitations, call sessions, and circle/revocation schemas.

### Verification Gates & Results

- **Root Checks (`npm ci && npm run lint && npm run build && npm test`):**
  - `eslint`: PASS
  - `next build`: PASS (27 static/dynamic routes generated)
  - `npm test`: PASS (152 root unit tests + 9 native plugin tests = 161 total tests passed, 0 failed across 34 test suites)
- **Mobile Checks (`cd mobile && npm ci && npm run typecheck && npm run lint && npm run format:check`):**
  - `tsc --noEmit`: PASS
  - `eslint`: PASS
  - `prettier --check`: PASS on touched files
- **Plugin Test (`NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js`):**
  - 9 tests passed, 0 failed.

### Known Risks & Open Findings

- `lib/trustStore.ts` stores state in process-local memory. Production serverless deployment requires shared durable storage (e.g., Redis or Postgres).
- Android carrier call audio access remains restricted by Android permissions (`CAPTURE_AUDIO_OUTPUT` is system-only). Real-time remote call speech transcription is not supported.

### Needs Human

- Physical two-device end-to-end QR pairing and call overlay verification on Android hardware.

### Plan for Tomorrow (Next 3 Tasks)

1. **Durable Trust Store Spike**: Design and prototype a shared database adapter for `lib/trustStore.ts` to support multi-instance serverless deployments.
2. **Expand API Integration Tests**: Add integration tests for edge cases in `/api/trust/invite` and `/api/trust/session` endpoints (e.g. rate limiting behavior, invalid proofs).
3. **Mobile Hook Unit Testing**: Add unit test coverage for mobile trust hooks and state managers.
