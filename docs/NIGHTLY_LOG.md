# Nightly Log

## 2026-10-11

- **Phase:** Roadmap Mode (post Oct 10, 2026 ForgeHacks submission).
- **Baseline Status:**
  - Root `npm test` initially failed because `node --test mobile/plugins/handshake-call-audio/plugin.test.js` could not resolve `@expo/config-plugins` when run from root without `NODE_PATH=mobile/node_modules`.
  - Root lint, Next.js build, and Prettier checks passed.
  - Mobile typecheck, lint, and Prettier checks passed.
  - Standalone plugin test passed when run with `NODE_PATH=mobile/node_modules`.
- **Work Selection:** Priority 1 (Broken things) — Fix baseline test suite failure in `package.json`.
- **What changed:**
  - Updated `package.json` test script so that `NODE_PATH=mobile/node_modules` is passed when running `plugin.test.js`.
  - Created `docs/NIGHTLY_LOG.md` to establish persistent nightly records.
- **Gates and Results:**
  - `npm test`: PASS (133 root unit tests passed, 9 native plugin tests passed).
  - Root `npm run lint`: PASS (0 errors).
  - Root `npm run build`: PASS (Next.js 16 production build succeeded, 27 pages generated).
  - Root `npm run format:check`: PASS (0 formatting issues).
  - Mobile `npm run typecheck`: PASS (0 TypeScript errors).
  - Mobile `npm run lint`: PASS (0 ESLint errors).
  - Mobile `npm run format:check`: PASS (0 formatting issues).
  - Standalone plugin test: PASS (`NODE_PATH=mobile/node_modules node --test mobile/plugins/handshake-call-audio/plugin.test.js`, 9/9 tests passed).
- **Known Risks & Open Findings:**
  - `lib/trustStore.ts` keeps trust state in process-local memory; multi-instance serverless deployments require shared persistence.
  - Carrier call two-way audio and WhatsApp call audio remain inaccessible due to Android platform constraints.
- **Needs Human:**
  - Physical device testing for two-phone QR invite/pairing and call overlay state on real hardware.
- **Plan for Tomorrow:**
  1. Roadmap item #1: Design and prototype shared durable storage adapter interface for `lib/trustStore.ts`.
  2. Add unit tests for `lib/rateLimit.ts` fixed-window limiter.
  3. Expand test coverage for schema validation boundaries in `lib/schemas.ts` and `lib/trustSchemas.ts`.
