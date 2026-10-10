# Handshake — implementation and verification status

**Last checked:** 2026-10-10 (UTC)  
**Current main commit:** `bd20190c1c7f86729e986051761b0de861c297d2`  
**Scope:** Hackathon prototype. A successful build confirms compilation and CI checks, not physical-device behavior or production security.

## Latest automated verification

### Android Release APK

- **Result:** SUCCESS — [GitHub Actions run #35](https://github.com/sudomarc/handshake/actions/runs/38021748599).
- **Source commit:** `bd20190c1c7f86729e986051761b0de861c297d2` (`main`, after the documentation/QA-artifact cleanup).
- **Artifact:** `handshake-apk`, [run artifacts](https://github.com/sudomarc/handshake/actions/runs/38021748599), artifact ID `11658498063`. GitHub lists it as available until 2026-11-09.
- **Package/version:** `com.sudomarc.handshake`, version `0.1.1`, versionCode `2`.
- **APK size:** 82,856,572 bytes.
- **SHA-256:** `b6482e041fac75801c016eab49740844e4956d745c969fc5faf1de28f42fa33e`.
- **ABI inspection:** APK includes native libraries for `arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`. It is a multi-ABI APK; the workflow's “arm64” label does not mean the packaged APK contains only ARM64 libraries.
- The workflow passed the root test suite and the Android Release build, and uploaded the artifact.

### Web and mobile checks

- **Result:** SUCCESS — [Web and Mobile Checks #8](https://github.com/sudomarc/handshake/actions/runs/38021748614), for the same `main` commit.
- Root automated tests: **133 passed, 0 failed**.
- Native config-plugin tests: **9 passed, 0 failed**, including the regression guard for the audio API name and the guard that checks the plugin Kotlin sources match the packaged Kotlin sources.
- Root ESLint and Next.js production build: PASS; 26 static pages generated.
- Mobile TypeScript check and ESLint: PASS, with no unused-variable warnings.
- The compile blocker `AudioManager.activeRecordingConfigs` was corrected to the Android API `activeRecordingConfigurations` in both Kotlin copies. The matching native-copy and API-name regression checks pass.

## Current capability boundaries

| Area | Status |
| --- | --- |
| Android-first mobile client and Next.js API | Present in source; web production build passes in CI |
| QR-based trusted-device pairing and trust-session routes | Implemented in source; **end-to-end pairing and trust recognition on this exact APK were not tested in this session** |
| Pressure Check on user-provided text | Available as advisory LLM-backed text analysis; not a voice-authenticity verdict |
| Android call-state awareness and optional overlay | Present in the native integration; behavior depends on supported call events, permissions and service lifecycle |
| Remote audio from ordinary carrier calls | Not available through the tested third-party Android capture approach |
| Private two-way audio from WhatsApp | Not available to this app |
| Live call transcription, live speech-risk analysis or cloned-voice detection | Not available capabilities in this release |
| WhatsApp call-popup coverage | Not guaranteed in current `main`; notification-listener changes remain in [open PR #36](https://github.com/sudomarc/handshake/pull/36). Even notification detection would not grant access to WhatsApp audio |
| Durable trust storage across serverless instances | Not available; `lib/trustStore.ts` stores state in process-local memory |
| Production authentication, device recovery, reviewed cryptography and security certification | Not complete |
| Current production deployment of the website/API | **Not verified in this audit.** CI built the site, but the production URL was inaccessible to the available verification tools; this is not evidence that the site is down |

## What remains unverified

**Physical-device verification of the APK from run #35 was not performed in this session.** The earlier [Android fake-call QA report](./ANDROID_FAKE_CALL_QA_2026-10-07.md) records a 2026-10-07 test of an older APK from commit `4a2952167e083a74b5daba8c99941abe4d5a219c`. Its 35 test-matrix rows recorded 23 PASS, 3 FAIL, 4 BLOCKED and 5 UNKNOWN. Those results are historical and must not be treated as a pass report for the current APK.

Before describing the latest release as fully verified, install the artifact from run #35 on the target phone and test:

1. Cold launch, permissions, foreground-service lifecycle and overlay dismissal.
2. Complete QR invite → scan → accept → confirm flow with two physical devices, including expired/used invitations.
3. Trust-state behavior during supported calls, both online and with the backend unavailable.
4. WhatsApp notification overlay behavior across repeated incoming/ongoing calls, recording misses. Do not equate an overlay event with audio access.
5. Pressure Check with benign and coercive user-supplied text, plus bounded offline/error handling.

A simulated Phony call is not proof of real carrier-call or WhatsApp behavior, and no overlay or microphone permission proves that remote speech is being captured.

## Known limitations and production blockers

1. **No remote call audio:** the current ordinary Android integration cannot access the remote side of carrier calls, and WhatsApp does not expose its private two-way audio to Handshake. Live transcription and real-time scam-risk analysis of those conversations therefore remain unimplemented.
2. **WhatsApp event detection:** notification-based detection is best-effort and its code is not integrated into `main` in this release. It must not be advertised as a popup on every call.
3. **Serverless persistence:** trust enrollments, invitations and sessions live in process-local memory. Multiple serverless instances can diverge, and process restarts can lose state; production requires shared durable storage.
4. **Production cryptography and account lifecycle:** the current prototype still needs a reviewed asymmetric device-key scheme, durable device recovery/revocation, production authentication, distributed abuse controls, and a privacy/retention review.

The current app must be presented as a **hackathon prototype for device trust plus advisory analysis of user-provided text**, not as a live-call audio analyzer or cloned-voice detector.

## Historical physical-device evidence

The [2026-10-06 device report](./DEVICE_TEST_REPORT_2026-10-06.md) records an earlier build and its failures and blocked checks. It concerns an older prototype and is not evidence of current call-audio capability.

## Before presenting a release

1. Select the exact successful artifact and record its workflow run and source commit.
2. Install that artifact on the target phone and preserve logs/screenshots of observed results.
3. Mark each test PASS, FAIL, BLOCKED or NOT RUN.
4. Narrate only outcomes actually observed. If pairing or popup behavior fails, disclose it; do not substitute a mockup or imply live audio analysis.
5. Keep live remote-audio analysis and cloned-voice detection out of feature claims unless those capabilities are independently demonstrated on a supported platform.

A green CI run proves the code passed the checks included in that workflow and that an APK was compiled. It does not establish real-world call integration or production security.
