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
| A1 | Install fresh APK over existing app | Install succeeds | UNKNOWN |
| A2 | Cold launch | No fatal/native crash | UNKNOWN |
| A3 | Relaunch after force-stop | App starts normally | UNKNOWN |
| A4 | Backend-configured build | App reaches deployed API | UNKNOWN |

### B. Permissions and protection arming

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| B1 | POST_NOTIFICATIONS permission flow on Android 13+ | Permission request is sane; denial does not crash | UNKNOWN |
| B2 | Overlay permission onboarding | Settings opens; returning to app is stable | UNKNOWN |
| B3 | Enable warnings | Foreground protection service starts | UNKNOWN |
| B4 | Restart app with warnings armed | Service behavior is consistent | UNKNOWN |

### C. Fake incoming call

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| C1 | Simulate incoming/ringing call | Overlay appears without crash | UNKNOWN |
| C2 | Observe ringing label | Label matches the actual evidence-based state | UNKNOWN |
| C3 | Transition to active/connected call | Overlay remains stable; no crash | UNKNOWN/BLOCKED if simulator cannot transition |
| C4 | End call | Overlay is removed cleanly | UNKNOWN |
| C5 | Repeat call twice | No duplicated overlays/services | UNKNOWN |

### D. Fake outgoing call

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| D1 | Simulate outgoing call | Call-state handling does not crash | UNKNOWN |
| D2 | Active outgoing state | Overlay behavior remains stable | UNKNOWN/BLOCKED |
| D3 | End outgoing call | Overlay removed cleanly | UNKNOWN |

### E. Overlay correctness / honesty

The current source contains a known wording risk: the active-call pill can display **"Handshake Protected"** even though the implementation currently observes call state rather than proving caller identity or analyzing audio. This must be tested and reported, not silently treated as a successful protection claim.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| E1 | Observe active-call pill text | Does not overclaim capabilities | UNKNOWN |
| E2 | Test with backend unreachable | No false "protected" claim | UNKNOWN |
| E3 | Close/dismiss overlay | Service/app remains stable | UNKNOWN |

### F. Risk overlay path

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| F1 | Run manual Check a call with a benign transcript | Advisory result renders | UNKNOWN |
| F2 | Run high-pressure transcript | Risk overlay appears if threshold is met | UNKNOWN |
| F3 | Tap Ignore | Risk overlay dismisses cleanly | UNKNOWN |
| F4 | Tap Verify now | Opens a real verification destination; no dead-end navigation | UNKNOWN |

### G. Identity verification

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| G1 | Create trusted person | Pair persists | UNKNOWN |
| G2 | Read current code | Code rotates every 30s with correct countdown | UNKNOWN |
| G3 | Submit correct code | Verified | UNKNOWN |
| G4 | Submit wrong code | Not verified + safe guidance | UNKNOWN |
| G5 | Repeat invalid attempts | Rate limiting behaves as documented | UNKNOWN |

### H. Backend / AI

Use the authorized environment credentials where required. Do not expose them.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| H1 | Pressure Check against deployed backend | Valid structured result | UNKNOWN |
| H2 | Personal Question against deployed backend | Valid challenge result | UNKNOWN |
| H3 | Temporary/invalid LLM output | Safe error handling/retry; no secret leakage | UNKNOWN |
| H4 | Network/API failure | User sees a bounded error state | UNKNOWN |

### I. Third-party calling apps

Use a third-party calling app such as WhatsApp only to confirm the documented companion behavior.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| I1 | Open third-party calling app | Handshake remains stable | UNKNOWN |
| I2 | Run manual Check a call | Manual transcript flow works | UNKNOWN |
| I3 | Verify no automatic private audio claim | UI/docs remain honest | UNKNOWN |

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
