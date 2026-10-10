# Product roadmap

This roadmap describes product direction, not a commitment that a feature is already shipped. Release status and physical-device evidence take precedence over plans.

## Current prototype

The repository contains a Next.js web/API application and the Handshake Personal Android client. Source code includes QR-based trusted-device pairing, trust-session endpoints, a call-state companion overlay and advisory analysis of text supplied by the user.

End-to-end behavior must be verified against the deployed backend and the exact APK being demonstrated. Source implementation or a successful build is not sufficient proof of on-device behavior.

## Next priorities

### 1. Make trust verification dependable

- Verify QR invitation, acceptance, confirmation, enrollment and revocation end to end.
- Ensure every displayed trusted state is backed by a confirmed trust result.
- Test online, offline, expired-invitation and restart scenarios.
- Replace instance-local in-memory trust storage before any production use.

### 2. Stabilize Android call companion behavior

- Validate runtime permissions, foreground-service lifecycle and overlay dismissal on supported Android versions.
- Test incoming and ended calls on physical devices, recording the device, Android version and APK commit.
- Test third-party calling apps separately; do not infer call detection from the app merely opening.
- Keep the interface honest when the call type or backend state cannot be verified.

### 3. Evaluate audio analysis only where supported

The current app does not receive remote audio from ordinary carrier calls or WhatsApp. Do not build or advertise a live audio pipeline until a supported audio source has been demonstrated on the target platform. If the required audio is unavailable, consider a platform-approved integration or a Handshake-controlled communication session instead.

### 4. Prepare for production

- Introduce durable shared storage and a defined data-retention policy.
- Add appropriate account, device-recovery and revocation flows.
- Review authentication, rate limiting, abuse handling and operational monitoring.
- Review the LLM provider's data-processing and retention terms before handling sensitive material.
- Complete security and privacy testing with documented results.

## Release criteria

A milestone is complete only when its acceptance checks pass on the intended environment, the evidence identifies the exact source commit and build, documentation matches observed behavior, and known limitations remain visible. No roadmap item should be presented as an available feature before those checks are complete.
