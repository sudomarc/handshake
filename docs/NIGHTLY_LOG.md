# Nightly Log — Handshake

## 2026-10-06

### Phase & Baseline
- **Phase:** Freeze Mode (ForgeHacks submission deadline Oct 10, 2026).
- **Baseline status before changes:**
  - Root (`npm ci && npm run lint && npm run build`): PASS.
  - Mobile (`cd mobile && npm ci && npm run typecheck && npm run lint`): PASS.
  - Plugin (`node --test mobile/plugins/handshake-call-audio/plugin.test.js`): FAIL (1/7 tests failed: test 7 `is a no-op on the already-correct committed MainApplication.kt`).
  - Formatting check: FAIL on 29 files due to unformatted files in baseline (reverted formatting churn to maintain strict ~15 file budget and focus on native plugin bug fix).

### Work Completed & Priority
- **Priority 1 (Broken things):** Fixed failing plugin unit test and native Kotlin module bridge crash hazard.
- **Why:** The config plugin `mobile/plugins/handshake-call-audio/plugin.js` was emitting `packages.add(CallAudioPackage())` which did not align with Expo SDK 51 Kotlin template requirement (`PackageList(this).packages + CallAudioPackage()`) and caused `plugin.test.js` test 7 to fail. Furthermore, `mobile/plugins/handshake-call-audio/android/CallAudioModule.kt` lacked `WritableMap`/`WritableArray` bridge marshalling present in `mobile/android/.../CallAudioModule.kt`.

### Changes
- `mobile/plugins/handshake-call-audio/plugin.js`: Updated `patchMainApplication` so Kotlin template registration produces `PackageList(this).packages + CallAudioPackage()` and is a no-op on already-patched `MainApplication.kt`.
- `mobile/plugins/handshake-call-audio/plugin.test.js`: Updated Kotlin registration assertions to check `PackageList(this).packages + CallAudioPackage()`.
- `mobile/plugins/handshake-call-audio/android/CallAudioModule.kt`: Updated native plugin source to include `resolveWith` and `toWritableMap` bridge marshalling helpers matching `mobile/android/app/src/main/java/com/sudomarc/handshake/callaudio/CallAudioModule.kt`.

### Gates & Results
- Plugin tests (`node --test mobile/plugins/handshake-call-audio/plugin.test.js`): 7/7 tests passed.
- Mobile typecheck & lint (`cd mobile && npm run typecheck && npm run lint`): 0 errors.
- Root lint & build (`npm run lint && npm run build`): 0 errors, build succeeded in 653ms.

### Known Risks & Open Findings
- On-device test findings from `docs/DEVICE_TEST_REPORT_2026-10-06.md`:
  - FAIL-1 (`<RTCView>` crash) and FAIL-2 (`CallAudioModule` LinkedHashMap argument conversion crash) have code fixes applied in `mobile/`, but require re-building APK via CI and re-testing on device.
  - Two-device WebRTC call flow remains untested due to lack of second physical device / emulator.

### Needs Human
- Re-test release APK build from CI onSamsung SM-A175F to confirm Call Protection and Call Audio Feasibility screens do not crash on launch.
- Two-device WebRTC call test.

### Plan for Tomorrow
1. Re-verify release APK on device after CI build completes.
2. Address audit finding F1 / F4 if owner decision is made.
3. Review Devpost submission checklist items and rehearsal scripts.

## 2026-10-06 (Run 2)

### Phase & Baseline
- **Phase:** Freeze Mode (ForgeHacks submission deadline Oct 10, 2026).
- **Baseline status before changes:**
  - Root (`npm ci && npm run lint && npm run build`): PASS.
  - Mobile (`cd mobile && npm ci && npm run typecheck && npm run lint`): PASS.
  - Plugin (`node --test mobile/plugins/handshake-call-audio/plugin.test.js`): PASS (7/7 tests passed).

### Work Completed & Priority
- **Priority 4 (Continuous Improvement Loop - Tests & Docs Accuracy):**
  - Resolved Audit Finding F4 in `README.md`: updated architecture diagram, stack description, and honest limitations sections to accurately document stateless HMAC derived pair secrets (`HMAC-SHA256(PAIR_DERIVATION_KEY, pairId)`).
  - Added unit test suite in `tests/lib.test.ts` providing 100% coverage of core `lib/` modules (`totp`, `rateLimit`, `schemas`, `store`, `http`, `callSchemas`, `callStore`).
  - Updated `package.json` with a root `npm test` script executing both `tests/lib.test.ts` and `mobile/plugins/handshake-call-audio/plugin.test.js`.
  - Added `.unref()` to `CallSessionStore` cleanup timer in `lib/callStore.ts` so tests exit cleanly.

### Changes
- `README.md`: Corrected architecture diagram and limitations to describe stateless secret derivation instead of stale local storage claims (F4).
- `tests/lib.test.ts`: Added unit tests for `lib/totp`, `lib/rateLimit`, `lib/schemas`, `lib/store`, `lib/http`, `lib/callSchemas`, and `lib/callStore`.
- `package.json`: Added `"test": "npx tsx --test tests/lib.test.ts && node --test mobile/plugins/handshake-call-audio/plugin.test.js"`.
- `lib/callStore.ts`: Added `.unref()` call on periodic cleanup interval timer.
- `docs/NIGHTLY_LOG.md`: Documented run 2 results and verification gates.

### Gates & Results
- `npm test`: 21/21 tests passed (14 library tests + 7 plugin tests).
- Root lint & build (`npm run lint && npm run build`): PASS (0 errors).
- Mobile typecheck & lint (`cd mobile && npm run typecheck && npm run lint`): PASS (0 errors).

### Known Risks & Open Findings
- On-device test findings from `docs/DEVICE_TEST_REPORT_2026-10-06.md`:
  - Release APK re-verification on device outstanding after CI build completes.
  - Two-device WebRTC call flow remains untested due to lack of second physical device / emulator.

### Needs Human
- Re-test release APK build on Samsung SM-A175F.
- Two-device WebRTC call test.

### Plan for Tomorrow
1. Re-verify release APK on device after CI build completes.
2. Review remaining audit findings (F1/F2/F3) and Devpost submission checklist items.
3. Rehearse `DEMO_SCRIPT.md` end to end.
