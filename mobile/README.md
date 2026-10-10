# Handshake Personal — Android client

Handshake Personal is the Android-first mobile client for the Handshake prototype. It includes trusted-person screens, a QR-based pairing flow, a call-state companion layer and advisory analysis of text supplied by the user.

## Capability boundaries

- QR pairing and device-trust flows are implemented in the source. Verify the full flow against the current APK and deployed backend before relying on it.
- The Android service can observe supported call-state events and show an optional overlay when its permissions and lifecycle conditions allow it.
- Pressure Check analyzes user-provided text. It does not analyze live call audio or prove who is speaking.
- The app does not receive remote audio from ordinary carrier calls or private two-way audio from WhatsApp.
- Third-party calling-app event detection is not guaranteed. An overlay appearing during a simulated call does not establish that a real carrier or WhatsApp call will behave the same way.

## Development

Install the mobile dependencies and start Expo:

    npm ci
    npm start

Static checks:

    npm run typecheck
    npm run lint

To run the repository's complete test suite, install dependencies in both the repository root and this directory, then run npm test from the repository root. The root suite includes native config-plugin tests.

## Release APK

Release builds are produced by [GitHub Actions](https://github.com/sudomarc/handshake/actions/workflows/android-apk.yml). Download the APK artifact from a successful run and use the artifact's source commit when recording results. The app's current behavior is not verified merely because CI produced an APK.

## Related documentation

- [Project overview](../README.md)
- [Architecture](../ARCHITECTURE.md)
- [Security and privacy](../SECURITY.md)
- [Product roadmap](../ROADMAP.md)
- [Implementation and verification status](../docs/FINAL_STATUS_2026-10-10.md)
- [Android audio research](../docs/ANDROID_AUDIO_RESEARCH.md)
- [Call audio feasibility report](../docs/CALL_AUDIO_FEASIBILITY.md)
- [Historical Android call QA](../docs/ANDROID_FAKE_CALL_QA_2026-10-07.md)
