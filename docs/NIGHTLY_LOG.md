# Nightly Engineering Log

## 2026-10-14

### Phase & Baseline

- **Phase:** ROADMAP MODE / Continuous Improvement Loop (Security, Rate Limiting & Unit Testing).
- **Baseline Status:**
  - Root: `npm ci && npm run lint && npm run build` passed cleanly. Root tests passed (133 tests). `format:check` noted existing formatting in untouched files.
  - Mobile: `cd mobile && npm ci && npm run typecheck && npm run lint` passed cleanly.
  - Native Plugin: `NODE_PATH=$(pwd)/mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` passed all 9 tests.

### Work Selected & Rationale

- **Priority Level:** Priority 4 - Continuous Improvement (Tests & Security Lens).
- **Task:** Added comprehensive unit tests for `lib/rateLimit.ts` in `tests/rateLimit.test.ts` and registered it in `package.json`'s test runner.
- **Why:** `lib/rateLimit.ts` handles API rate limiting across sensitive endpoints (`/api/code/verify`, `/api/analyze`, `/api/trust/invite`, etc.). Adding explicit tests for window alignment, capacity limits (`MAX_BUCKETS`), eviction (`sweep`), overflow handling, and `retryAfterSeconds` calculation secures key boundary controls against abuse regressions.

### Changes Made

- Created `tests/rateLimit.test.ts` with 6 targeted test cases for fixed-window rate limiting logic.
- Updated `package.json` `test` script to include `tests/rateLimit.test.ts`.

### Gates & Results

- **Root Lint:** PASS
- **Root Build:** PASS (`next build` generated 27 static/dynamic pages)
- **Root Test Suite:** PASS (139 tests passed, 0 failed)
- **Plugin Test Suite:** PASS (9 tests passed)
- **Mobile Typecheck & Lint:** PASS (`tsc --noEmit` and `eslint` passed with 0 errors)
- **Prettier formatting:** PASS for touched files (`package.json`, `tests/rateLimit.test.ts`).

### Known Risks & Unresolved Findings

- `lib/rateLimit.ts` and `lib/trustStore.ts` store state in process-local memory. On serverless multi-instance deployments, counters and sessions do not sync across instances. Shared durable storage (e.g. Redis) is required for production.

### Needs Human

- Physical device verification of QR invitation/acceptance/confirmation flow on real Android hardware.
- Physical device verification of call companion overlay and lifecycle behavior.

### Plan for Tomorrow

1. Add unit tests for `lib/http.ts` error handling and header responses.
2. Review and add test coverage for `lib/store.ts` and `lib/callStore.ts`.
3. Audit mobile `lib/trust/orchestrator.ts` edge cases and test fallbacks.
