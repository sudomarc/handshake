# Nightly Log — 2026-10-12

## 1. Boot Sequence & Phase
- **Date:** 2026-10-12
- **Phase:** ROADMAP MODE (Post-Oct 10, 2026)
- **Branch:** `nightly/2026-10-12` (created from `main`)
- **Baseline Gates Status:**
  - Root (`npm ci && npm run lint && npm run build`): PASS
  - Mobile (`cd mobile && npm ci && npm run typecheck && npm run lint`): PASS
  - Plugin (`NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js`): PASS
  - Root tests (`npm test`): PASS (133 tests passed across 28 suites)

## 2. Work Selection
- **Selected Priority:** Priority 4 — Continuous Improvement Loop (Tests & Correctness lens).
- **Reason:** No broken builds or blockers on `main`. High-priority roadmap items require multi-device physical testing or shared infrastructure migrations. Strengthening test coverage around security-critical boundaries (`lib/rateLimit` and `lib/http`) improves stability and edge-case validation.

## 3. Changes Made
- Created `docs/NIGHTLY_LOG.md` (inter-night memory log).
- Added comprehensive unit tests in `tests/lib.test.ts` for:
  - `lib/rateLimit.ts`: MAX_BUCKETS capacity overflow, bucket sweep behavior on expiry, and rate limit refusal under bucket pressure.
  - `lib/http.ts`: `handleApiError` HTTP status and code mappings for all `TrustError` variants (`device_revoked`, `device_not_enrolled`, `inviting_not_found`, `invalid_proof`, `nonce_replayed`), as well as provider diagnostic message formatting.

## 4. Verification Gates
- **Root:** `npm ci && npm run lint && npm run build` -> PASS
- **Mobile:** `cd mobile && npm ci && npm run typecheck && npm run lint` -> PASS
- **Plugin:** `NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js` -> PASS
- **Unit Tests:** `npm test` -> PASS (All tests passing)

## 5. Known Risks & Open Findings
- Trust Store remains process-local in-memory state (`lib/trustStore.ts`). Multi-instance serverless deployments need shared durable storage (e.g. Postgres/Redis) before production use.
- Remote two-way carrier call audio capture is constrained by Android platform security boundaries (`CAPTURE_AUDIO_OUTPUT` permission is system-only).

## 6. Needs Human
- Physical two-device end-to-end QR pairing and call session verification using the compiled Android APK on actual devices.

## 7. Plan for Tomorrow
1. Priority 1 (Roadmap / Trust Verification): Prototype durable shared storage schema interface for device enrollments and session attestations.
2. Priority 4 (Continuous Improvement - Mobile Quality): Verify mobile offline error states and error messages in `mobile/lib/trust/api.ts`.
3. Priority 4 (Continuous Improvement - Tests): Add unit test coverage for `mobile/lib/trust/proof.ts` canonical proof construction edge cases.
