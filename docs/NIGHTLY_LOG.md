# Handshake Nightly Log

This log records daily maintenance, test evidence, roadmap progress, and findings across nightly automation runs.

---

## 2026-10-11

### Phase and baseline status

- **Phase:** ROADMAP MODE (current date 2026-10-11 is after ForgeHacks submission deadline of 2026-10-10).
- **Baseline status:** GREEN.
  - Root checks (`npm ci && npm run lint && npm run build`): PASS.
  - Mobile checks (`cd mobile && npm ci && npm run typecheck && npm run lint`): PASS.
  - Root test suite (`npm test`): PASS (133 baseline tests passed).
  - Native plugin test suite (`NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js`): PASS (9 tests passed).

### Work selection

- **Priority level:** Level 2 (Roadmap).
- **Task:** Roadmap Priority 1 — "Make trust verification dependable: Ensure every displayed trusted state is backed by a confirmed trust result."
- **Rationale:** No broken build/lint/test issues existed. Added missing unit test coverage for the core call state decision machine (`deriveCallState` and `deriveOutsideCallState`) in `mobile/lib/trust/callState.ts`.

### What was changed

1. Created `tests/callState.test.ts`:
   - Added 12 unit tests covering all state precedence rules (risk outranks trust evidence), active call evidence evaluation (trusted vs verifying vs analyzing vs initializing), diagnostic states (`offline`, `capture_unavailable`), and fallback states (untrusted circle, revoked device trust).
   - Added unit tests for outside-call state derivation (`deriveOutsideCallState`).
2. Updated `package.json`:
   - Added `tests/callState.test.ts` to the `test` script pipeline.
3. Created `docs/NIGHTLY_LOG.md`:
   - Initialized the nightly log file to track repository state and memory across runs.

### Gates and results

- `npm run lint`: PASS.
- `npm run build`: PASS (Next.js production build succeeded, 27 pages generated).
- `cd mobile && npm run typecheck`: PASS (0 TypeScript errors).
- `cd mobile && npm run lint`: PASS (0 ESLint errors/warnings).
- `npm test`: PASS (145 root unit tests passed across 30 suites).
- `NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js`: PASS (9 plugin tests passed).

### Known risks and open findings

- In-memory storage limitation: `lib/trustStore.ts` stores paired devices and call sessions in process memory. On serverless hosting with multiple instances, state does not sync across workers; shared durable storage is required for production.

### Needs human

- Physical Android device testing of release APK for QR scanning, overlay permissions, and live call companion behavior across two physical phones.

### Plan for tomorrow

1. Roadmap Priority 1: Add mock-driven unit tests for `mobile/lib/trust/session.ts` (`runCallTrust` timeout, progress callback updates, and peer join workflows).
2. Roadmap Priority 1: Verify QR invitation edge cases (rate limiting, malformed inputs, expired invite handling).
3. Roadmap Priority 2: Audit call companion foreground service and overlay state transitions across simulated call lifecycles.
