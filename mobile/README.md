# Handshake Personal — Android app

Handshake Personal is the Android-first mobile client for the Handshake hackathon prototype. It provides QR-based trusted-device pairing, a trust-status interface, a call-state overlay, and access to advisory text-risk checks.

**Release status:** this is a prototype. The overlay is not proof that a call has been authenticated and does not mean live speech analysis is running. Handshake does not receive the remote side of ordinary carrier-call audio or WhatsApp's private two-way audio. WhatsApp call-event detection is not guaranteed in the current `main` branch. See [the final release status](../docs/FINAL_STATUS_2026-10-10.md) before describing capabilities in a demo.

## Current user flows

- **Trusted people:** review trusted-device relationships and manage pairing.
- **QR pairing:** one phone creates a short-lived invitation, the other scans and accepts it, and the first phone confirms the relationship.
- **Call-status overlay:** Android can report supported carrier-call state events and show the current trust state when the native service is running and permissions are granted.
- **Pressure Check:** advisory risk analysis of text supplied by the user. It does not analyse the live call audio and does not prove who is speaking.
- **Personal Challenge / first-hour guidance:** supporting verification and response flows where available in the current build.

## Important limitations

1. **No live remote-call audio analysis.** Android does not expose the remote audio of ordinary carrier calls through the tested third-party capture path. WhatsApp does not expose its private two-way audio to this app. A granted microphone permission is not proof that remote speech is being captured.
2. **WhatsApp overlay is not guaranteed on `main`.** Notification-based call detection work exists in an open pull request and is not part of the audited release commit. Do not promise a pop-up for every incoming, ongoing, or outgoing WhatsApp call.
3. **Call state is not caller identity.** Detecting that an app or carrier call is ringing/active does not establish who is speaking. A “Trusted connection” state is valid only when the device relationship and backend session checks succeed.
4. **Backend state is not production-durable.** The current trust store is in-memory and can diverge between serverless instances. See [the trusted-call architecture](../docs/TRUSTED_CALL_ARCHITECTURE.md) and [security requirements](../SECURITY.md).
5. **Final device test is mandatory.** Automated tests and successful compilation do not replace two-device pairing tests and real-device overlay checks on the exact APK intended for submission.

## Development

Requirements: Node.js 20, npm, and (for native builds) JDK 17 plus Android SDK tooling.

```bash
cd mobile
npm install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` to the backend URL for the intended environment. The release workflow currently bakes in `https://handshake-pi-amber.vercel.app`; see [`.env.example`](./.env.example).

## Tests and static checks

From the repository root:

```bash
npm install
npm test
```

Mobile-specific checks:

```bash
cd mobile
npm run typecheck
npm run lint
```

The root test suite includes a non-regression test that compares native Kotlin sources under `mobile/plugins/handshake-call-audio/android/` with the packaged sources compiled from `mobile/android/app/src/main/java/`. Keep those copies in sync.

## Release APK (GitHub Actions)

The release build is produced by [`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml) on pushes to `main` that change `mobile/**`, or by manually dispatching the workflow in GitHub Actions.

1. Open [GitHub Actions for Handshake](https://github.com/sudomarc/handshake/actions/workflows/android-apk.yml).
2. Select the successful `android-apk` run for the intended `main` commit.
3. Download the `handshake-apk` artifact and install the APK on the target Android device.
4. Record the run ID, commit SHA, device model, Android version, and observed pass/fail/block results in the QA report.

The workflow installs root and mobile dependencies, runs `npm test`, and builds the arm64 release APK directly from the checked-in `mobile/android` sources. A green build confirms CI tests and compilation; it does **not** confirm runtime behavior on a phone.

## Source map

- `app/(tabs)/index.tsx` — home / current status and entry points.
- `app/(tabs)/trusted.tsx` — trusted people.
- `app/pair.tsx` and `components/PairingFlow.tsx` — QR invitation flow.
- `app/trusted/[id].tsx` — trusted-person details.
- `lib/trust/` — device identity, pairing, proof generation, session orchestration and trust-state resolution.
- `lib/call/` and `lib/callOverlay.ts` — call session lifecycle and native overlay bridge.
- `lib/audio/` — audio-source feasibility/probe and state orchestration; this code does not create access to audio that Android withholds.
- `plugins/handshake-call-audio/` — Expo native config plugin and Kotlin source templates.
- `android/app/src/main/` — checked-in native Android sources used by the GitHub Actions APK build.

## QA references

- [Android fake-call QA handoff](../docs/ANDROID_FAKE_CALL_QA_2026-10-07.md)
- [Audio feasibility findings](../docs/CALL_AUDIO_FEASIBILITY.md)
- [Final release status and remaining work](../docs/FINAL_STATUS_2026-10-10.md)
