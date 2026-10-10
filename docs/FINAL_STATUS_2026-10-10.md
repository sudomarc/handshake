# Handshake — implementation and verification status

This page summarizes known capability boundaries and historical evidence. It is not a live CI status page. Check [GitHub Actions](https://github.com/sudomarc/handshake/actions) for current workflow results and use an artifact built from the commit being evaluated.

## Current capability boundaries

| Area | Status |
| --- | --- |
| Android-first mobile client and Next.js API | Present in the repository |
| QR-based trusted-device pairing and trust-session routes | Implemented in source; validate end to end against the deployed backend and current APK |
| Pressure Check on user-provided text | Implemented as advisory LLM-backed analysis; not a voice-authenticity verdict |
| Android call-state awareness and optional overlay | Present in the native integration; behavior depends on supported events, permissions and service state |
| Remote audio from ordinary carrier calls | Not available through the current third-party capture approach |
| Private two-way audio from WhatsApp | Not available to this app |
| Live call transcription or cloned-voice detection | Not available capabilities in this release |
| Durable trust storage across serverless instances | Not available in the prototype |
| Production authentication, device recovery and security certification | Not complete |

## Historical physical-device evidence

The [Android fake-call QA report](./ANDROID_FAKE_CALL_QA_2026-10-07.md) records a 2026-10-07 test of an older APK from commit 4a2952167e083a74b5daba8c99941abe4d5a219c. Across its 35 test-matrix rows, the report recorded 23 PASS, 3 FAIL, 4 BLOCKED and 5 UNKNOWN.

The failed cases included an active-call overlay that displayed “Handshake Protected” without a completed verification, the same wording while offline, and a “Verify now” action that did not route to a verification screen. These findings apply to the exact historical artifact tested in that report. They must not be silently marked fixed or assumed to describe the latest APK; re-test the latest build on-device.

The [2026-10-06 device report](./DEVICE_TEST_REPORT_2026-10-06.md) records an earlier build and its observed failures and blocked checks. It is retained as historical evidence, not a statement about the latest source.

## Before presenting a release

1. Select a successful Android artifact from GitHub Actions and record its source commit.
2. Install that exact artifact on the target phone.
3. Test the complete pairing and trust flow against the deployed backend.
4. Check that no trusted state appears unless the backend confirms it; repeat with the backend unavailable.
5. Test the text-analysis flow with benign and coercive examples and narrate only the observed result.
6. Test overlay behavior for each call type being claimed. A simulated call is not proof of carrier-call or WhatsApp behavior.
7. Keep live remote-audio analysis and cloned-voice detection out of the feature claims unless those capabilities are independently demonstrated on a supported platform.

A successful automated test suite or APK build does not establish real-world call integration, production security or access to remote call audio.
