# Android Fake-Call QA Report & Handoff

Date: 2026-10-07  
Repository: `sudomarc/handshake`  
QA branch: `qa/android-fake-call-2026-10-07`  
Base under test: `main` @ `ca538b13e402951198830e5a9ee51240d692084d`

## Purpose

This document is the persistent QA handoff for testing Handshake Personal against simulated phone calls.

Every future mobile QA or bug-fixing agent must read this report together with `AGENTS.md`, `ROADMAP.md`, and the latest device report before changing call/overlay behavior.

The objective is to test the **currently shipped Personal mobile product**, not the retired Handshake-to-Handshake WebRTC prototype.

## Execution status

**NOT EXECUTED IN THIS session.**

> Update 2026-10-07: the physical device run has since been executed on a Samsung SM-A175F. See **Execution 2026-10-07 (device run)** near the end of this document for the complete results. The matrix below now carries those device results; the original audit text is preserved above unchanged.

The GitHub repository and current source were audited, and a repeatable PR APK build path was added in this branch. Physical fake-call execution remains a device-side task because this session has no ADB-connected Android device and no way to interact with the user's installed fake-call application.

Do not mark any device test below as PASS/VERIFIED until it has been observed on the target device and recorded here.

## Credentials / environment authorization

The QA agent is explicitly authorized by the repository owner to use **credentials already present in environment variables** when they are required for testing.

Rules:

- Read and use the required environment variables directly from the test environment.
- Never print secret values.
- Never commit secret values.
- Never paste secret values into this report, PR comments, logs, screenshots, or issue bodies.
- Record only the variable name and whether the test could access it.
- Prefer the deployed production API configured by the APK for device testing.
- Do not create new credentials merely to make a test pass unless the repository owner explicitly requests it.

Typical server-side variables include `FEATHERLESS_API_KEY`, `FEATHERLESS_BASE_URL`, `FEATHERLESS_MODEL`, and `PAIR_DERIVATION_KEY`. The mobile APK must only receive public configuration such as `EXPO_PUBLIC_API_BASE_URL`.

## APK source rule

The device test must use an APK built from the exact commit being tested.

A previously successful artifact is **not** sufficient when `main` has moved.

At audit time:

| Artifact | Commit | Status |
| --- | --- | --- |
| Latest successful `android-apk` artifact available before this PR | `154d7e9b819117c5d57a116425b15d5659ae8fa1` | **STALE vs current main** |
| Current source baseline | `ca538b13e402951198830e5a9ee51240d692084d` | **CURRENT** |

The current `main` contains additional commits after `154d7e9b`, including notification permission handling and API timeout/diagnostic changes. Build the PR branch APK before device validation.

Record:

- APK build workflow run ID
- source commit SHA
- APK SHA-256
- Android version
- device model
- fake-call application name and version

## Fake-call application

Use the installed fake-call application available on the test device (the repository owner has previously used **Phony** for this purpose) to simulate:

1. an incoming call;
2. an active/connected call when the tool supports it;
3. an ended call;
4. an outgoing call when the tool supports it.

Treat the fake-call app as a **simulation tool**. Do not describe simulated calls as proof of real carrier-network behavior.

Record exactly which call states the fake-call tool can generate. If it cannot reproduce a state, mark that state BLOCKED rather than fabricating a result.

## Current product boundaries to preserve

The current mobile product:

- accompanies ordinary operator phone calls;
- may show an optional overlay above the Phone app and other calling apps;
- supports a manual **Check a call** flow for phone calls, WhatsApp, and other third-party calling apps;
- does **not** automatically receive private two-way audio from WhatsApp or other third-party calling apps;
- does **not** replace the Phone app with a Handshake-only call;
- does **not** currently perform live carrier-call audio → STT → risk analysis;
- uses the rotating shared code as the authoritative identity-verification mechanism;
- treats Pressure Check and Personal Challenge as advisory/internal capabilities.

Do not expand scope into caller-number matching, new permissions, carrier-call audio interception, or a new VoIP product during this QA pass unless a separate owner-approved task supersedes the freeze.

## Required test matrix

### A. Install / startup

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| A1 | Install fresh APK over existing app | Install succeeds | PASS |
| A2 | Cold launch | No fatal/native crash | PASS |
| A3 | Relaunch after force-stop | App starts normally | PASS |
| A4 | Backend-configured build | App reaches deployed API | PASS |

### B. Permissions and protection arming

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| B1 | POST_NOTIFICATIONS permission flow on Android 13+ | Permission request is sane; denial does not crash | PASS |
| B2 | Overlay permission onboarding | Settings opens; returning to app is stable | BLOCKED |
| B3 | Enable warnings | Foreground protection service starts | PASS |
| B4 | Restart app with warnings armed | Service behavior is consistent | PASS |

### C. Fake incoming call

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| C1 | Simulate incoming/ringing call | Overlay appears without crash | PASS |
| C2 | Observe ringing label | Label matches the actual evidence-based state | PASS |
| C3 | Transition to active/connected call | Overlay remains stable; no crash | PASS |
| C4 | End call | Overlay is removed cleanly | PASS |
| C5 | Repeat call twice | No duplicated overlays/services | PASS |

### D. Fake outgoing call

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| D1 | Simulate outgoing call | Call-state handling does not crash | BLOCKED |
| D2 | Active outgoing state | Overlay behavior remains stable | BLOCKED |
| D3 | End outgoing call | Overlay removed cleanly | BLOCKED |

### E. Overlay correctness / honesty

The current source contains a known wording risk: the active-call pill can display **"Handshake Protected"** even though the implementation currently observes call state rather than proving caller identity or analyzing audio. This must be tested and reported, not silently treated as a successful protection claim.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| E1 | Observe active-call pill text | Does not overclaim capabilities | FAIL |
| E2 | Test with backend unreachable | No false "protected" claim | FAIL |
| E3 | Close/dismiss overlay | Service/app remains stable | PASS |

### F. Risk overlay path

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| F1 | Run manual Check a call with a benign transcript | Advisory result renders | PASS |
| F2 | Run high-pressure transcript | Risk overlay appears if threshold is met | PASS |
| F3 | Tap Ignore | Risk overlay dismisses cleanly | PASS |
| F4 | Tap Verify now | Opens a real verification destination; no dead-end navigation | FAIL |

### G. Identity verification

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| G1 | Create trusted person | Pair persists | PASS |
| G2 | Read current code | Code rotates every 30s with correct countdown | UNKNOWN |
| G3 | Submit correct code | Verified | UNKNOWN |
| G4 | Submit wrong code | Not verified + safe guidance | UNKNOWN |
| G5 | Repeat invalid attempts | Rate limiting behaves as documented | UNKNOWN |

### H. Backend / AI

Use the authorized environment credentials where required. Do not expose them.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| H1 | Pressure Check against deployed backend | Valid structured result | PASS |
| H2 | Personal Question against deployed backend | Valid challenge result | UNKNOWN |
| H3 | Temporary/invalid LLM output | Safe error handling/retry; no secret leakage | PASS |
| H4 | Network/API failure | User sees a bounded error state | PASS |

### I. Third-party calling apps

Use a third-party calling app such as WhatsApp only to confirm the documented companion behavior.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| I1 | Open third-party calling app | Handshake remains stable | PASS |
| I2 | Run manual Check a call | Manual transcript flow works | PASS |
| I3 | Verify no automatic private audio claim | UI/docs remain honest | PASS |

## Evidence requirements

For every FAIL, record:

1. exact reproduction steps;
2. exact APK commit and SHA-256;
3. device model + Android version;
4. fake-call app + version;
5. timestamp;
6. Logcat excerpt or other direct evidence;
7. whether the issue is reproducible;
8. likely root cause (clearly marked as inference unless verified);
9. smallest corrective scope;
10. next test that must be run after the fix.

Use these status labels only:

- **VERIFIED** — observed directly on the test device.
- **PASS** — automated or deterministic test completed successfully.
- **FAIL** — directly observed defect.
- **BLOCKED** — test could not be executed for a stated environmental reason.
- **UNKNOWN** — not yet tested.
- **INFERENCE** — explanation inferred from evidence, not directly proven.

## Handoff rule

After device execution, update this same file in the same PR/commit series with the complete results.

Then:

- keep all unresolved bugs documented here;
- update `ROADMAP.md` only to reflect evidence-backed status;
- create follow-up bug-fix work from the concrete findings;
- require the next mobile agent to read this report before modifying related code;
- never delete a failed test merely because the implementation was later changed; preserve the historical result and add a new dated result.

## Historical context

The archived `docs/DEVICE_TEST_REPORT_2026-10-06.md` contains real failures from the retired WebRTC/audio prototype, including the old `RTCView` and React Native bridge crashes. Those components were removed from the current mobile product and must not be reported as current shipped behavior.

The newer `docs/CALL_PROTECTION_IMPLEMENTATION_GAP_REPORT.md` documents the remaining overlay gaps on the then-audited branch: misleading "Protected" wording, non-clickable pill, incomplete Verify routing, and lack of backend-reachability awareness. Treat those findings as hypotheses to re-check against the exact APK under test.

## Final QA conclusion for this audit

The source audit is complete enough to define the current test boundary and execute the fake-call QA safely, but the **physical fake-call test itself is not completed in this session**.

No device result in this document should be promoted to VERIFIED until the test matrix above is executed on the current-commit APK.

---

## Execution 2026-10-07 (device run)

This section records the completed physical device run. It is appended; the audit text above is preserved unchanged.

### Run identity

| Item | Value |
| --- | --- |
| Date | 2026-10-07 (device local time ~19:15–19:50) |
| Commit under test | `4a2952167e083a74b5daba8c99941abe4d5a219c` (PR-18 merge on `main`) |
| APK source | GitHub Actions `Android QA APK` workflow run `37664538883`, artifact `handshake-qa-apk` |
| APK local path | `qa/out/app-release.apk` |
| APK SHA-256 | `BBE61750A3BA341D69CAB027B292355F7471A4A1D0B7CD50145F9D7B5E55C039` |
| Device | Samsung SM-A175F (serial `RFGL516YXCB`), Android 16, API 36 |
| ADB | 37.0.1-15733141 |
| Fake-call app | Phony, package `com.upnp.fakeCall`, v2.6 (versionCode 26) |
| Phony call states used | incoming/ringing, answered/active, ended. **No outgoing support** (confirmed by repository owner and by app inspection) |
| App under test package | `com.sudomarc.handshake` |

### Environment credentials (availability only)

- `FEATHERLESS_API_KEY`: **NOT available** in the test environment (`Test-Path env:FEATHERLESS_API_KEY` = False). Not needed: device tests used the deployed API, which carries its own server-side configuration.
- `ADAPTION_API_KEY`: present in the environment but unrelated to Handshake; not used.
- No secret values were printed, logged, screenshotted, or committed during this run.

### Results summary

Counts across the 35 matrix rows: **PASS 23 · FAIL 3 · BLOCKED 4 · UNKNOWN 5**.

| Group | PASS | FAIL | BLOCKED | UNKNOWN |
| --- | --- | --- | --- | --- |
| A Install/startup | 4 | 0 | 0 | 0 |
| B Permissions/arming | 3 | 0 | 1 | 0 |
| C Fake incoming call | 5 | 0 | 0 | 0 |
| D Fake outgoing call | 0 | 0 | 3 | 0 |
| E Overlay correctness | 1 | 2 | 0 | 0 |
| F Risk overlay path | 3 | 1 | 0 | 0 |
| G Identity verification | 1 | 0 | 0 | 4 |
| H Backend/AI | 3 | 0 | 0 | 1 |
| I Third-party apps | 3 | 0 | 0 | 0 |

### A. Install / startup — all PASS

- **A1 PASS**: `adb install -r qa/out/app-release.apk` returned `Success` on a device that already had the app installed.
- **A2 PASS**: cold launch showed the Home screen (`Protection ready / Ready to verify`); no FATAL EXCEPTION or native crash in logcat.
- **A3 PASS**: force-stop then relaunch started the app normally.
- **A4 PASS**: deployed API reachable — `https://handshake-pi-amber.vercel.app/api/code/current?pairId=test` returned HTTP 400 (API alive, rejecting the malformed pairId as designed); in-app checks later confirmed end-to-end reachability.

### B. Permissions and protection arming

- **B1 PASS**: `POST_NOTIFICATIONS` = GRANTED (also `READ_PHONE_STATE` granted); denial path not exercised, but no crash observed at any point. Evidence: `adb shell dumpsys package com.sudomarc.handshake` permission state.
- **B2 BLOCKED**: `SYSTEM_ALERT_WINDOW` was already `allow` on the device before the run, so the overlay onboarding dialog/Settings hand-off could not be exercised honestly. The button read "Warnings enabled" rather than presenting the permission flow. Not revoked mid-run to avoid confounding the remaining overlay tests; re-test with the permission pre-denied on a clean state.
- **B3 PASS**: after tapping the warnings/enable control, `HandshakeOverlayService` was running as `isForeground=true foregroundId=1002 types=0x40000000` (notification-backed foreground service).
- **B4 PASS**: after force-stop + relaunch with warnings armed, the service re-entered the foreground state consistently (same `ServiceRecord`, same foreground ID).

### C. Fake incoming call — all PASS

- **C1 PASS**: Phony incoming call → overlay window present (`appop=SYSTEM_ALERT_WINDOW`); OCR of `qa/out/qa_C1_ringing.png` reads "Handshake • Phone call". Telecom logged `state=RINGING` (Phony uses a self-managed/VOIP connection, so `dumpsys telephony.registry` stays `mCallState=0` while Telecom CallAudio state is RINGING).
- **C2 PASS**: ringing label is the evidence-based wording "Handshake • Phone call" — no protection claim while ringing. Evidence: `qa/out/qa_C1_ringing.png`.
- **C3 PASS**: answered via `adb shell input keyevent 5` → Telecom `state=ACTIVE`; overlay remained stable, no crash. **Text observed: "Handshake Protected" — see E1 FAIL.** Evidence: `qa/out/qa_C3_state.png`, `qa/out/qa_C3_after_answer.png`.
- **C4 PASS**: ended call (Phony "End call") → overlay window removed cleanly; only the MainActivity window remained (`appop=NONE`); no FATAL EXCEPTION. Evidence: `qa/out/qa_C4_after_end.png`.
- **C5 PASS**: two repeated incoming calls produced exactly one overlay window and one `ServiceRecord` each time; no duplicated overlays or services. Evidence: `qa/out/qa_C5_active2.png`.

### D. Fake outgoing call — BLOCKED

- **D1/D2/D3 BLOCKED**: Phony cannot generate outgoing calls (confirmed directly by the repository owner: the outgoing popup does not exist in the app). No other fake-call tool was installed for this run. No outgoing result is claimed.

### E. Overlay correctness / honesty

- **E1 FAIL**: during an ACTIVE call with no identity verification performed, the pill displayed **"Handshake Protected"**. Expected: wording that does not overclaim. This confirms the known wording risk flagged in this report's preamble and in the gap report. Evidence: `qa/out/qa_C3_state.png`, `qa/out/qa_C3_after_answer.png` (OCR reads "Handshake Protected").
  - Root cause (**INFERENCE**, source-consistent): `HandshakeOverlayService.kt` renders `text = if (ringing) "Handshake • Phone call" else "Handshake Protected"` — the active-call branch is unconditional.
  - Reproducible: yes (same text observed on every answered call this run).
  - Smallest corrective scope: change the active-call branch to an evidence-based label (e.g. "Handshake • Phone call") or gate "Protected" on an actual completed verification.
  - Next test after fix: repeat C3 and confirm the active pill wording.
- **E2 FAIL**: with airplane mode enabled (backend unreachable), an answered fake call still showed **"Handshake Protected"** in the pill — a false claim while verification/analysis is unavailable. Expected: no false "protected" claim when offline. Evidence: `qa/out/qa_E2_offline.png`, `qa/out/qa_E2_offline_active.png`. Airplane mode was disabled after the test (`airplane_mode_on` = 0).
  - Root cause (**INFERENCE**): same unconditional active-call label; the overlay service does not consult backend reachability before rendering state (matches gap-report hypothesis "lack of backend-reachability awareness").
  - Smallest corrective scope: same wording fix as E1; reachability awareness if a genuine state distinction is intended.
  - Next test after fix: repeat E2 offline.
- **E3 PASS**: tapping the pill's × at screen (1000, 198) removed the overlay window; the foreground service stayed alive, the call kept ringing, no crash. Evidence: `qa/out/qa_E3_before_dismiss.png`, `qa/out/qa_E3_after_tap.png`.

### F. Risk overlay path

- **F1 PASS**: benign transcript produced "No high-pressure signal / Pressure 0/100" plus the advisory disclaimer ("Text analysis is advisory … does not prove who is speaking") and no risk overlay. First attempt hit the transient diagnostic below; a retry succeeded. Evidence: `qa/out/qa_F1_result.png`.
- **F2 PASS**: high-pressure transcript ("police … send money now … do not hang up") produced "High pressure detected — Pressure 100/100" and the risk overlay card rendered as a real `SYSTEM_ALERT_WINDOW` (window frame 1012×769 at y=50) with heading "HANDSHAKE / Suspicious interaction" and Ignore / Verify now buttons. Evidence: `qa/out/qa_F2_overlay.png`, `qa/out/qa_F2_buttons.png`.
- **F3 PASS**: tapping **Ignore** dismissed the overlay window cleanly (only `appop=NONE` windows remained), in-app state preserved, no crash. Coordinates validated on the same overlay instance. Evidence: `qa/out/qa_F3_before_ignore.png`.
- **F4 FAIL**: tapping **Verify now** does not open a verification destination.
  - Observed twice, in both app-foreground and app-background states. With the app backgrounded on the launcher, the tap fired `ActivityTaskManager: START u0 {act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.sudomarc.handshake/.MainActivity (has extras)} with LAUNCH_SINGLE_TASK … result code=2`, i.e. it merely relaunched/foregrounded `MainActivity` and landed back on the **same risk-result screen** (no navigation to `/verify` or any verification flow).
  - Additional defect: the overlay card **remains visible** after Verify now (the click handler does not remove the overlay), so the tap appears to do nothing on screen. Ignore, by contrast, removes it.
  - Reproducible: yes (2/2).
  - Root cause (**INFERENCE**, source-consistent): `HandshakeOverlayService.kt` puts `putExtra("handshakeOverlayAction", "verify")` on the launch intent, but `MainActivity` never reads that extra, and the verify listener never calls the overlay-removal path. This matches gap-report finding "incomplete Verify routing".
  - Smallest corrective scope: consume `handshakeOverlayAction` in `MainActivity` (route to the verification screen) and dismiss the risk card on tap.
  - Next test after fix: repeat F4 from background and confirm arrival at a verification destination and overlay dismissal. Evidence: `qa/out/qa_F4_before.png`, `qa/out/qa_F4_retry.png`, `qa/out/qa_F4_bg_before.png`, `qa/out/qa_F4_result.png`, logcat excerpt quoted above.

### G. Identity verification

- **G1 PASS**: created trusted person "Mom" from the Trusted people screen; entry appeared with status "Active" and persisted across navigation (existing person "Son" also still listed). Evidence: `qa/out/qa_G2_code.png` (Trusted people/Verify screens).
- **G2–G5 UNKNOWN**: skipped at the repository owner's explicit request during this run ("skip the mycode tests" / "skip"). Note for the next run: the code display was incidentally opened once and rendered "834 378 / Changes in 23s", which is consistent with a 30-second rotating code, but **rotation over time and the correct/wrong/rate-limit paths were not tested** and no result is claimed.

### H. Backend / AI

- **H1 PASS**: manual Pressure Check ran against the deployed backend (`handshake-pi-amber.vercel.app`) and returned valid structured results matching `pressureCheckResponseSchema` behaviour: benign → "No high-pressure signal, Pressure 0/100"; hostile → "High pressure detected, Pressure 100/100" with an LLM rationale and advisory disclaimer. Evidence: `qa/out/qa_F1_result.png`, `qa/out/qa_F2_overlay.png`.
- **H2 UNKNOWN**: Personal Question / challenge flow not exercised — the verification-code flow was skipped at the owner's request before reaching it.
- **H3 PASS**: transient invalid LLM output was observed twice (`Temporary diagnostic: Featherless returned invalid JSON (finish_reason=unknown, len=305/315)`). Handling was safe: the message rendered as an inline bounded error, the user could retry, the retry succeeded, and **no secret values (API keys, URLs with credentials, prompts) appeared** in the UI, screenshots, or logcat. Note: the diagnostic string exposes internal provider details to end users — cosmetic/honesty issue worth a follow-up, not a secret leak. Related commit: `ca538b1` ("chore(api): report finish_reason on invalid JSON (temporary)").
- **H4 PASS**: with airplane mode enabled, Run check rendered the bounded error **"No connection to the server."**, preserved the typed transcript, kept the Run check button available for retry, and did not crash. Evidence: `qa/out/qa_H4_offline.png`. Connectivity restored afterwards (`airplane_mode_on` = 0, ping to the deployed host succeeded 2/2).

### I. Third-party calling apps — all PASS

- **I1 PASS**: WhatsApp (v2.26.37.73) launched to its home screen while Handshake warnings were armed; `HandshakeOverlayService` remained `isForeground=true`, no crash, no FATAL EXCEPTION in logcat. Evidence: `qa/out/qa_I1_whatsapp2.png`.
- **I2 PASS**: the manual "Check a call" transcript flow (the documented companion mechanism for third-party apps) worked end-to-end — input, analysis, advisory/risk rendering, and dismissal (F1–F3 above).
- **I3 PASS**: Home screen copy remains honest — "Handshake does not receive private call audio from those apps automatically." — and the result screen disclaimer states text analysis "does not prove who is speaking". No claim of automatic third-party audio capture was found in the UI. Evidence: Home UI dump, `qa/out/qa_F1_result.png`.

### Automated checks (local, commit `4a29521`)

| Check | Result |
| --- | --- |
| `npm test` | PASS — 32/32 tests (25 API/lib + 7 plugin) |
| `npm run lint` | PASS — eslint, no findings |
| `npm run build` | PASS — Next.js 16.3.8 Turbopack build, 18 pages |
| `cd mobile && npm run typecheck` | PASS — `tsc --noEmit` clean |
| `cd mobile && npm run lint` | PASS — eslint clean |
| `cd mobile && npm run format:check` | **FAIL — pre-existing**: 290 files flagged by Prettier, including Android `build/intermediates/` artifacts and core sources. Verified pre-existing: `git status` shows **no modified tracked files**, and `mobile/app/_layout.tsx` fails the check while being byte-identical to HEAD. Not introduced by this run. Follow-up: exclude `android/app/build/**` from Prettier and format sources in a dedicated commit. |

### Verified / Failed / Blocked / Remaining

**Verified (device-observed):** install, cold launch, force-stop relaunch, backend reachability, notification permission grant, foreground overlay service start and restart, incoming ringing overlay with evidence-based label, answered-call overlay stability, clean overlay removal on call end, no duplicate overlays across repeated calls, overlay manual dismissal, benign advisory analysis, high-pressure risk overlay, Ignore dismissal, offline bounded error, trusted-person creation, third-party app stability, honest no-audio-capture copy.

**Failed (device-observed, reproducible):**

1. **E1** — active-call pill claims "Handshake Protected" with no verification behind it.
2. **E2** — same false claim persists with the backend unreachable (airplane mode).
3. **F4** — "Verify now" dead-ends: relaunches MainActivity without routing to verification, and leaves the risk card on screen.

**Blocked:** B2 (overlay permission pre-granted), D1–D3 (Phony has no outgoing-call support).

**Unknown / not run:** G2–G5 and H2 (skipped at owner request during this run).

**Remaining for the next run:** G2–G5 (rotate/read code over time, correct/wrong code, rate limit), H2 (Personal Question), B2 with the overlay permission pre-denied, and re-tests of E1/E2/F4 after their fixes. Outgoing-call coverage (D) additionally requires a fake-call tool that can place outgoing calls.

### Evidence inventory

Screenshots and dumps for this run are in `qa/out/` (`qa_home_after_install`, `qa_C1_ringing`, `qa_C1_incall`, `qa_C3_state`, `qa_C3_after_answer`, `qa_C4_after_end`, `qa_C5_active2`, `qa_E2_offline`, `qa_E2_offline_active`, `qa_E3_before_dismiss`, `qa_E3_after_tap`, `qa_F1_result`, `qa_F2_overlay`, `qa_F2_buttons`, `qa_F3_before_ignore`, `qa_F4_before`, `qa_F4_retry`, `qa_F4_bg_before`, `qa_F4_result`, `qa_F4_final`, `qa_G2_code`, `qa_H4_offline`, `qa_I1_whatsapp2`), plus the APK under test. OCR was performed with Tesseract (`--psm 11` / `--psm 6 tsv`) against those screenshots.

Label note: rows above marked PASS were observed directly on the device during this run; per this document's rules they carry device evidence as listed. FAIL rows carry logcat/screenshot evidence and reproduction steps.
