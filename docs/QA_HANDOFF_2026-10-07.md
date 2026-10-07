# QA Handoff — 2026-10-07

## Purpose

This document is the handoff record for the full-repository QA audit of Handshake Personal.

It is intentionally evidence-driven. It separates repository-verified facts, repository-reported test results, and tests that could not be executed from this environment.

**Base audited:** `main` at commit `ca538b13e402951198830e5a9ee51240d692084d`  
**Repository:** `sudomarc/handshake`  
**Audit date:** 2026-10-07  
**Repository tree:** 160 tracked files; GitHub recursive tree reported `truncated=false`.

## Governance read before audit

Read before analysis:

- `AGENTS.md`
- `README.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `SECURITY.md`
- `DEMO_SCRIPT.md`
- `HACKATHON.md`
- `docs/CALL_AUDIO_FEASIBILITY.md`
- `docs/CALL_PROTECTION_IMPLEMENTATION_GAP_REPORT.md`
- `docs/DEVICE_TEST_REPORT_2026-10-06.md`
- `docs/NIGHTLY_LOG.md`
- root and mobile package/build configuration
- Android workflows
- current root/mobile source, API routes, native overlay code and existing tests

The audit follows the repository rule to keep the hackathon core stable, make the smallest correct change, and never report simulated behavior as live behavior.

## Explicit test authorization

For this QA run and subsequent authorized debugging work, the test agent is explicitly authorized to use **all credentials/tokens already supplied through the execution environment's environment variables** when they are required to exercise the project, deployed API, Vercel/Expo workflows, or other configured test services.

Rules:

1. Use the existing environment credentials; do not hard-code replacements.
2. Never print, commit, upload, or include secret values in logs, screenshots, reports, issues, or PRs.
3. Use credentials only for project testing/debugging.
4. Prefer the minimum request volume needed to establish a result.

Known server-side credential names include `FEATHERLESS_API_KEY` and `PAIR_DERIVATION_KEY`. The repository documents these as environment-only secrets.

## Existing test/PR state

There is already an open automated mobile-test PR:

- **PR #16** — `test(mobile): add mobile unit test suite and clean up import paths`
- Head: `075c3b265bf9ce792eaf1901fd17122bacb1cff5`
- It reports 41 tests across 4 suites, but it is **not merged into main** at the time of this audit.

There is also:

- **PR #15** — adds the mobile `npm test` script and updates the nightly log.

Therefore this PR does **not** duplicate PR #16. It adds a native-overlay parity test and the complete QA handoff/runbook.

## What was verified from GitHub

### Repository / architecture

- Handshake is currently split into a root Next.js prototype/API and a `mobile/` Expo/React Native Android client.
- The current product direction is a companion layer around ordinary operator calls and third-party calling apps.
- The mobile product no longer contains the Handshake-to-Handshake WebRTC call UI.
- Carrier-call audio is not currently analyzed.
- The authoritative identity check is the shared rotating code.
- Pressure Check is advisory and is based on user-provided transcript text.

### Automated tests already present

Current root `package.json` contains:

```text
npm test
  -> npx tsx --test tests/lib.test.ts tests/api.test.ts
  -> node --test mobile/plugins/handshake-call-audio/plugin.test.js
```

The existing plugin test suite contains 7 tests covering Kotlin/Java registration, idempotence, repair of the previously broken state, and the committed Android `MainApplication.kt`.

Repository history reports successful baseline runs on earlier commits. Those results are retained as **repository-reported evidence**, not as a fresh execution performed in this environment.

### Android build evidence

GitHub Actions run `37634489771` completed successfully on 2026-10-07 and produced artifact `handshake-apk` (artifact id `11488255948`).

Important: that artifact was built from commit `07f51bd49e85130aacf8c4e6ccb24c4350c51d70`, which is **behind current main** (`ca538b13...`). It therefore cannot be treated as the final APK for the current HEAD.

The downloaded APK contains strings for:

- `Handshake Protected`
- `HandshakeOverlayService`
- `handshakeOverlayAction`
- `android.permission.POST_NOTIFICATIONS`

This confirms those implementation strings are present in that older build; it does not prove current runtime behavior on the current HEAD.

### Vercel deployment

The Vercel project `handshake` exists and is connected to `sudomarc/handshake`.

Current production deployment observed:

- status: READY
- branch: `main`
- commit: `ca538b13e402951198830e5a9ee51240d692084d`

The current production deployment has the aliases:

- `handshake-pi-amber.vercel.app`
- `handshake-git-main-patrickk2s-projects.vercel.app`
- `handshake-patrickk2s-projects.vercel.app`

This means the two backend hostnames currently hard-coded in the Android workflow and EAS profiles are both valid aliases of the production deployment. The difference is configuration drift/maintenance risk, not an observed functional failure.

## Critical findings

### QA-001 — Overlay can claim "Protected" without proving protection

**Severity:** High — product correctness / trust claim

The native overlay currently renders `Handshake Protected` after a call becomes active. The implementation only observes carrier call state; it does not establish caller identity, verify the rotating code, or analyze two-way carrier-call audio.

The repository's existing call-protection gap report already records this as a misleading claim.

**Required follow-up:**

- use an honest Verify-oriented state for an unverified caller;
- do not imply caller identity or audio analysis;
- keep the wording consistent with the actual capability.

### QA-002 — Overlay Verify action is dead wiring

**Severity:** High — functional gap

The native risk card creates an intent extra named `handshakeOverlayAction=verify`, but the audit report records no consumer in `MainActivity.kt` or JavaScript routing. The action therefore does not complete the intended navigation into the existing verification flow.

**Required follow-up:**

Wire the existing intent end-to-end to the appropriate `/verify/[pairId]` flow, without inventing a new call architecture.

### QA-003 — Overlay root is not a verification control

**Severity:** High — UX/functionality

The current pill has a close control, but the pill itself is not a Verify action. This prevents the intended quick entry from the call surface into Handshake verification.

**Required follow-up:**

Make the call-surface action explicit and user-triggered. Do not make it look like an invisible monitoring system.

### QA-004 — Offline state can still look protected

**Severity:** High — correctness of security claim

The overlay service has no backend reachability check before presenting its protection wording. The authoritative rotating-code check requires the API.

**Required follow-up:**

Show a neutral/offline state when the service cannot rely on the backend. Do not label the user Protected merely because a call is active.

### QA-005 — Native overlay implementation exists in two copies

**Severity:** Medium — maintenance / regression risk

The same native overlay implementation exists under:

- `mobile/plugins/handshake-call-audio/android/` (config-plugin source)
- `mobile/android/app/src/main/java/com/sudomarc/handshake/callaudio/` (generated/build tree)

The current copies are expected to stay identical. Manual edits can create source/build drift.

This PR adds a parity test for the native Kotlin files so future agents get a deterministic failure when the copies diverge.

### QA-006 — Config plugin references a missing native source file

**Severity:** Low — maintenance

`mobile/plugins/handshake-call-audio/plugin.js` still lists `CallScreeningServiceImpl.kt` in its native-copy list, but that file is not present in the current plugin Android source directory.

The code checks existence before copying, so this is not an observed build failure. It is stale configuration that should be removed or intentionally restored only if a future supported feature requires it.

### QA-007 — Temporary provider diagnostics remain on main

**Severity:** High — cleanup required after evidence capture

Current `lib/featherless.ts` and `lib/http.ts` contain explicitly marked temporary diagnostics that surface provider failure details such as the HTTP status, finish reason, and response length.

These diagnostics were introduced to investigate live `/api/analyze` failures. They do not expose the API key in the current code, but they should not become permanent production behavior.

**Required follow-up:**

Revert the temporary diagnostic code once the failure mode has been captured and documented.

### QA-008 — Full-device/fake-call execution was not possible in this environment

**Status:** BLOCKED / NOT VERIFIED

The repository and APK artifact were inspected, but this execution environment does not provide the user's Android device, ADB session, emulator, or the requested fake-call application as an executable test surface.

Therefore this audit **does not claim** that a fake call was simulated successfully, that `TelephonyCallback.RINGING/OFFHOOK` fired in the test environment, or that the overlay behaved correctly on a live device during this run.

This distinction is intentional.

## Fake-call test runbook for the next agent

### Preconditions

1. Check out the latest PR branch or latest `main`.
2. Build/install the **current** Android APK from the commit under test.
3. Put the target Samsung device online.
4. Grant the required overlay permission and notification permission where requested.
5. Configure the test environment using the already-provided environment variables. Never paste secrets into the repository.
6. Use the requested fake-call app **only if it produces a real Android/system call-state transition**. A fake UI that only looks like an incoming call will not prove that Handshake's native `TelephonyCallback` path works.

### Test matrix

| ID | Scenario | Expected evidence |
|---|---|---|
| FC-01 | Cold start | Handshake opens without crash |
| FC-02 | Create trusted person | Pair is created and stored |
| FC-03 | Current rotating code | Code matches server response and 30 s rotation |
| FC-04 | Correct verification | Returns Verified |
| FC-05 | Wrong verification | Returns Not verified |
| FC-06 | Expired/old code | Rejected according to TOTP window |
| FC-07 | Fake/system incoming call | Native call-state listener observes RINGING |
| FC-08 | Call connects | Native listener observes OFFHOOK |
| FC-09 | Call ends | Native listener observes IDLE and overlay leaves call state |
| FC-10 | Overlay wording | No unjustified "Protected" claim |
| FC-11 | Tap call-surface action | Opens the real Handshake verification flow |
| FC-12 | Risk overlay | Risk card is visible only after an actual risk result |
| FC-13 | Verify-now action | Navigates to the real verification target |
| FC-14 | Backend unavailable | UI reports neutral/offline state; no false protection claim |
| FC-15 | Kill/relaunch | Stored trust data and startup behavior remain correct |
| FC-16 | Third-party calling app | Manual Check-a-call path remains usable while the other app is open |
| FC-17 | AI pressure check | Configured model is actually called; returned JSON passes schema validation |
| FC-18 | AI challenge | Configured model is actually called; question uses supplied private context |
| FC-19 | Network failure | Error is user-readable and does not expose secrets |
| FC-20 | Rate limiting | 429 + Retry-After behavior works for protected endpoints |

### Evidence required

For every failing case, record:

- APK commit SHA;
- device model/build;
- test app/version;
- exact reproduction steps;
- observed UI/state;
- relevant logcat/error excerpt with secrets removed;
- expected result;
- actual result;
- severity;
- whether the failure is mobile/native, backend, CI/configuration, or product wording.

Do not convert a simulated fake call into a claim of real carrier-call integration.

## Native parity test added by this PR

Run:

```text
node --test tests/native-overlay-parity.test.js
```

The test compares the current plugin source copy with the generated Android copy for:

- `CallAudioPackage.kt`
- `HandshakeOverlayModule.kt`
- `HandshakeOverlayService.kt`

This is a maintenance guard. It does not replace on-device testing.

## Recommended next-agent work order

1. Run the fake/system-call matrix above on the target Samsung A17 using the current APK.
2. Capture the live overlay behavior and record evidence.
3. Fix QA-001 through QA-004 with the smallest change that matches `AGENTS.md`.
4. Keep the native parity test passing.
5. Remove stale `CallScreeningServiceImpl.kt` copy configuration if confirmed unused.
6. Capture the current `/api/analyze` provider failure evidence, then remove QA-007 temporary diagnostics.
7. Rebuild the APK from the resulting commit and repeat the live device matrix.
8. Do not claim carrier-call audio analysis or voice-clone detection unless the platform capability is independently demonstrated.

## Final audit state

**Verified from repository/CI metadata:** repository structure, governance documents, product boundary, source-level overlay implementation, existing tests, current/main commit, Vercel production deployment metadata, and an older successful Android artifact.

**Repository-reported but not freshly executed here:** historical unit/build/device results recorded in PRs and project logs.

**Not verified in this environment:** the requested live fake-call execution on the target Android device, current-HEAD APK installation, current-HEAD overlay behavior, and current-HEAD end-to-end mobile QA.

The report is deliberately left versioned in the repository so the next agent can continue from evidence instead of repeating an undocumented audit.
