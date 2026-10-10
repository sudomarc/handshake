# Handshake — Release status and remaining limitations

**Date:** 2026-10-10 (UTC)  
**Repository:** https://github.com/sudomarc/handshake  
**Default branch:** `main`  
**Purpose:** Honest handoff for the final ForgeHacks submission. This report distinguishes repository/CI evidence from physical-device verification.

## Release build status

- The landing-page merge is on `main` at `31604b14bd`.
- The first Android build triggered by that merge (workflow run [#27](https://github.com/sudomarc/handshake/actions/runs/38012935766)) failed in the test step because the native config-plugin test could not resolve `@expo/config-plugins`. The workflow installed root dependencies and ran `npm test` before installing the mobile dependencies.
- CI correction committed to `main`: `85b41c82c0` moves mobile dependency installation before `npm test` in `.github/workflows/android-apk.yml`.
- QA workflow correction committed to `main`: `fb9784fc7a` installs mobile dependencies in the QA test job before `npm test`.
- Android build run [#31](https://github.com/sudomarc/handshake/actions/runs/38020859960) was in progress when this report was written. **Do not describe the build from the final `main` commit as successful until this run has completed successfully and an APK artifact exists.**
- The most recent successful APK build identified during the audit is run [#30](https://github.com/sudomarc/handshake/actions/runs/38015233788), from the divergent branch `feat/call-session-audio-source-manager`, commit `09e348cc5f`. CI reports 137 TypeScript/module tests and 8 native-plugin tests passing, followed by a successful arm64 release APK build. Its `handshake-apk` artifact was present and listed as expiring on 2026-11-09. **That build is not built from `main`; do not treat it as proof that the release commit is verified.**

## Implemented in source, but not all re-verified on the final APK

- Android call-state monitoring and a permission-controlled overlay.
- A QR invitation flow and trusted-device/session API.
- Honest trust/audio states designed not to label microphone-only audio as remote-party audio.
- Automated unit/API tests for pairing, session trust, call lifecycle, source selection and the Expo config plugin.
- A marketing landing page merged into `main`.

These source-level and CI facts do not by themselves establish that every feature works on a physical device.

## Known limitations that must be disclosed

### 1. Live call audio

The current ordinary Android integration does **not** access the remote side of carrier-call audio. Android's tested third-party app path also does not expose WhatsApp's private two-way audio stream to Handshake. Requesting microphone permission is not evidence that the remote caller is being captured.

Consequently, live speech-to-text and real-time scam-risk analysis of ordinary carrier or WhatsApp calls are **not implemented as a verified end-to-end capability**. Pressure analysis is advisory and can analyse text entered by the user; it must not be presented as analysis of the live conversation.

Evidence: [Android audio feasibility](CALL_AUDIO_FEASIBILITY.md), [trusted-call architecture](TRUSTED_CALL_ARCHITECTURE.md).

### 2. WhatsApp call overlay detection

The improvements for recognizing WhatsApp call notifications are in open PR [#36](https://github.com/sudomarc/handshake/pull/36), not integrated into the audited `main` commit. That PR describes notification-based, best-effort recognition and explicitly does not guarantee detection for every call. Audio access is not provided by this notification integration. Do not claim universal WhatsApp popup coverage without a successful repeatable device test.

### 3. Pairing and call trust

Unit tests and prior reports cover parts of the QR invitation and trust protocol. A complete two-physical-device pairing followed by trusted/untrusted recognition **must be re-run against the final APK** before it is claimed as verified for this release. Simulated Phony calls are not proof of real carrier call audio access, and Phony does not cover all outgoing-call cases.

### 4. Backend persistence and production security

`lib/trustStore.ts` uses in-memory process-local state for enrolled devices, invitations and call sessions. On serverless hosting, different instances can have different state; this is not a durable shared production store. The architecture/security documentation also identifies production cryptography work, including moving from the current proof scheme to asymmetric device keys (for example Ed25519) with server-side public-key registration. Treat the current implementation as a hackathon prototype, not a production-grade security guarantee.

### 5. Final device and hosting checks

- Install the APK built from the final `main` SHA on the Samsung SM-A175F.
- Verify cold launch, permissions, QR scan/accept/confirm on two devices, and overlay transitions for incoming/active/ended calls.
- Repeat a WhatsApp notification test several times with notification access enabled, then disabled, and record misses.
- Verify pressure analysis and API failure handling against the deployed backend.
- Verify the landing page's production deployment separately; a successful Git merge is not proof of deployment.

## Submission and evidence rule

Use only outcomes actually observed in CI or on-device evidence. Mark each remaining check as PASS, FAIL, BLOCKED or NOT RUN. Do not describe unavailable call audio, untested popup triggers, or simulated states as working live features. If time runs out before the final physical-device pass, submit with the limitations above disclosed clearly.

The demo video is a separate submission requirement and is not produced by this technical report.
