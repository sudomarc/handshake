# Android Audio Access Research — Official Documentation Findings

**Date:** 2026-10-05 (initial) — **Updated: 2026-10-10**
**Target Device:** Samsung A17 / SM-A175F (Android 16, API 36, arm64-v8a)
**Expo SDK:** 51 (React Native 0.74.5)

> **2026-10-10 update.** This document now distinguishes *declared → granted →
> opened → actually containing remote voice* for every claim, incorporates the
> community-source research required by the call-pipeline mandate, and records
> device-measured evidence. See "Update 2026-10-10" sections inline. Status
> categories used throughout: **VERIFIED** (direct device or official-doc
> evidence), **DOCUMENTED** (official docs only, not yet reproduced on this
> device), **HYPOTHESIS**, **NOT AVAILABLE**.

---

## EXECUTIVE SUMMARY

**Third-party apps CANNOT access carrier call audio (remote voice) on Android.**

The `CAPTURE_AUDIO_OUTPUT` permission required for `VOICE_UPLINK`, `VOICE_DOWNLINK`, `VOICE_CALL` audio sources is explicitly documented as:
> "reserved for use by system components and is not available to third-party applications."

---

## DOCUMENTED BY ANDROID

### CallScreeningService
- **Purpose:** Screen/block incoming calls, caller ID
- **Metadata available:** Phone number, call direction, verification status, contact match
- **Audio access:** NONE
- **Constraints:** Must respond within 5 seconds; only receives calls not in contacts (unless `READ_CONTACTS` granted)
- **Role:** `ROLE_CALL_SCREENING` (user-selectable)

### InCallService
- **Purpose:** Replace default phone app UI entirely
- **Audio access:** Can observe call audio state, routing, endpoints via `CallAudioState` / `CallEndpoint`
- **Requirements:** Must become default dialer (`ROLE_DIALER`); must handle ALL calls on device
- **Architectural impact:** Massive — replaces system phone app

### ConnectionService
- **Purpose:** VoIP integration with Telecom framework
- **Audio access:** Only for YOUR VoIP calls (not carrier calls)
- **Audio routing:** Can manage endpoints for own connections
- **Use case:** Building a calling app (WhatsApp, Signal, etc.)

### AudioRecord Audio Sources

| Source | Constant | Permission Required | Third-party Access |
|--------|----------|---------------------|-------------------|
| `MIC` | 1 | `RECORD_AUDIO` | ✅ YES |
| `VOICE_RECOGNITION` | 6 | `RECORD_AUDIO` | ✅ YES |
| `VOICE_COMMUNICATION` | 7 | `RECORD_AUDIO` | ✅ YES |
| `UNPROCESSED` | 5 | `RECORD_AUDIO` | ✅ YES |
| `VOICE_UPLINK` | 2 | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `VOICE_DOWNLINK` | 3 | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `VOICE_CALL` | 4 | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `REMOTE_SUBMIX` |  | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |

### Audio Sharing Rules (Android 10+)
**"Voice call + ordinary app":**
- The call ALWAYS receives audio
- Ordinary app can capture audio ONLY if:
  - It is an accessibility service, OR
  - It is a privileged (pre-installed) app WITH `CAPTURE_AUDIO_OUTPUT`
- Regular third-party app: receives SILENCE when call is active

### Foreground Service Types (Android 14+)
- **microphone**: Requires `FOREGROUND_SERVICE_MICROPHONE` + `RECORD_AUDIO`
  - Cannot start from background (while-in-use restriction)
  - Must have visible activity when starting
- **phoneCall**: For `ConnectionService` apps with `MANAGE_OWN_CALLS` or default dialer
  - NOT a shortcut to carrier call audio

---

## OBSERVABLE ON DEVICE (HYPOTHESIS — NEEDS TESTING)

| Capability | Expected Result |
|------------|-----------------|
| Local microphone capture (`MIC`) | ✅ WORKS |
| Local microphone during carrier call | ⚠️ Likely SILENCE (call takes priority) |
| `VOICE_UPLINK` / `VOICE_DOWNLINK` | ❌ PERMISSION DENIED |
| `CallScreeningService` metadata | ✅ WORKS (for unknown callers) |
| `InCallService` audio state | ❌ REQUIRES DEFAULT DIALER |
| Background microphone FGS | ❌ CANNOT START FROM BACKGROUND (Android 14+) |

---

## HYPOTHESIS

1. **Local microphone capture works** when no call is active
2. **During carrier call**, `AudioRecord` with `MIC` source likely returns silence (call has priority)
3. **Remote audio (downlink) is NOT accessible** to third-party apps — requires system privilege
4. **Call detection via CallScreeningService works** but only for non-contacts (unless contacts permission granted)
5. **Becoming default dialer (InCallService)** is the only path to carrier call audio — but requires replacing the entire phone app UX

---

## NON DISPONIBLE

- Carrier call uplink/downlink audio for third-party apps
- `CAPTURE_AUDIO_OUTPUT` permission for regular apps
- Background microphone foreground service start on Android 14+
- Call audio access without being default dialer or system-privileged

---

## NON TESTÉ

- Actual behavior of `AudioRecord` with `MIC` source during active carrier call on Samsung A17
- `CallScreeningService` behavior with `READ_CONTACTS` granted
- VoIP call audio via `ConnectionService` (Handshake-controlled session)
- Background microphone capture via accessibility service

---

# Update 2026-10-10 — Community research, device evidence, honest status framework

This section was produced during the 2026-10-10 call-pipeline audit. Every claim
below carries a status. Nothing is marked VERIFIED without direct evidence
(device output or official doc text), and the four access stages are kept
separate:

1. **DECLARED** — the app requests the permission / source in the manifest or code.
2. **GRANTED** — the runtime permission is actually granted by the user/ADB.
3. **OPENED** — `AudioRecord.start()` succeeds and the buffer receives samples.
4. **CONTAINS REMOTE VOICE** — those samples actually contain the *remote party's*
   speech (not only local/ambient audio), and the app can attribute them.

A path is only useful for remote analysis when stage 4 holds. Stages 1–3 must
never be reported as stage 4.

## 1. Official sources (re-verified 2026-10-10)

- **Sharing audio input** (developer.android.com/media/platform/sharing-audio-input,
  last updated 2026-10-01) — "Voice call + ordinary app":
  - a voice call is active when `AudioManager.getMode()` is `MODE_IN_CALL`
    **or** `MODE_IN_COMMUNICATION`;
  - the call always receives audio;
  - "The app can capture audio if it is an **accessibility service**";
  - "The app can capture the voice call if it is a **privileged (pre-installed)
    app with permission `CAPTURE_AUDIO_OUTPUT`**";
  - `AudioRecordingConfiguration.isClientSilenced()` tells the app whether its
    capture is being silenced by capture policy (programmatic truth source).
- **MediaRecorder.AudioSource** reference — `VOICE_UPLINK`, `VOICE_DOWNLINK`,
  `VOICE_CALL`, `REMOTE_SUBMIX` require `CAPTURE_AUDIO_OUTPUT`, "reserved for
  use by system components and is not available to third-party applications".

## 2. Community sources (2026-10-10, with exact conditions)

| Source | Claim | Exact conditions / verdict |
|---|---|---|
| AOSP `source.android.com/docs/core/audio/implement-policy` | "Accessibility service: Can record even if a privacy-sensitive use case is active." | Official AOSP policy doc — confirms accessibility services are exempt from capture-policy silencing. |
| AOSP concurrent-capture doc | Concurrency policy is implemented by **silencing** captured audio, not by rejecting recording start; a capture from the AP can happen while a voice call is active. | Explains why `start()` succeeding (stage 3) does not prove usable audio (stage 4). |
| scrcpy issue #5412 (2023) | "VOICE_DOWNLINK works on Android 14." | Only via `adb shell` (uid 2000, package `com.android.shell`), which itself holds `CAPTURE_AUDIO_OUTPUT`. Maintainer confirmed a normal app on a non-rooted Android 13 phone was denied. **Not available to a normal app.** |
| Ars Technica / PCMag coverage of Google Play policy (2022) | Apps historically tried accessibility-service call recording; Google Play banned call-recording apps that use AccessibilityService. | Accessibility-based capture is technically possible but policy-restricted for call recording, and testers reported "only my end — or silence". |

## 3. Device evidence (Samsung SM-A175F, Android 16 / API 36, 2026-10-10, ADB)

| Fact | Evidence | Status |
|---|---|---|
| Installed build is stale vs `main` HEAD | `dumpsys package com.sudomarc.handshake`: versionName 0.1.1, lastUpdateTime 2026-10-09 22:01:47 (HEAD commits f3fb14d/2278657 are 22:45) | VERIFIED |
| `RECORD_AUDIO` **not granted** | `dumpsys package`: `android.permission.RECORD_AUDIO: granted=false` | VERIFIED |
| `READ_PHONE_STATE` granted, FGS + FGS_SPECIAL_USE granted | same dump | VERIFIED |
| Overlay permission granted | `appops get … SYSTEM_ALERT_WINDOW`: allow | VERIFIED |
| Phony (com.upnp.fakeCall) sets `MODE_IN_COMMUNICATION` during simulated calls | `dumpsys audio` mode history (`setMode(MODE_IN_COMMUNICATION) from package=com.upnp.fakeCall` and `com.android.server.telecom`) | VERIFIED |
| Phony + WhatsApp installed; Google Meet **not installed** | `pm list packages` | VERIFIED |
| No Handshake notification listener / accessibility service enabled | `settings get secure enabled_notification_listeners` / `enabled_accessibility_services` | VERIFIED |

Consequence: a Phony simulated call puts the platform in `MODE_IN_COMMUNICATION`,
so it *does* trigger the platform "voice call" audio-sharing scenario. That makes
Phony a valid tool to test **platform audio policy** (silencing, routing,
`isClientSilenced`), but per AGENTS.md it must **never** be presented as proof of
real carrier or WhatsApp/Meet call audio behavior.

## 4. Honest capability matrix for a normal (non-preinstalled) Handshake build

| Path | Declared | Granted | Opened during call | Contains remote voice | Status |
|---|---|---|---|---|---|
| `MIC` / `VOICE_RECOGNITION` / `VOICE_COMMUNICATION`, no call | yes | user-dependent | yes | n/a (no call) | DOCUMENTED (stage 4 n/a) |
| `MIC`-family during active call, ordinary app | yes | user-dependent | likely yes, **silenced** | no (silence or local-only) | HYPOTHESIS → on-device test planned |
| `MIC`-family during active call, **accessibility-service** app | yes | user opts in via Settings | expected yes, **not silenced** | only acoustic (speakerphone) — mixed with local speech, earpiece ⇒ ~none | HYPOTHESIS → on-device test planned; attribution still mixed ⇒ `REMOTE_SPEECH_NOT_ISOLATED` |
| `VOICE_UPLINK`/`VOICE_DOWNLINK`/`VOICE_CALL`/`REMOTE_SUBMIX` | attempted via probe | never grantable to normal app | `SecurityException` / open failure | would be pure remote | NOT AVAILABLE (stage 2 impossible) |
| Preinstalled/system variant with `CAPTURE_AUDIO_OUTPUT` | requires platform signing + allowlist + `/etc/permissions` | device-vendor | yes | yes (uplink/downlink) | OUT OF SCOPE for standard build — production prerequisite, not implemented |

## 5. What this means for the audio source manager (design constraints)

- Step "open device" must never be conflated with step "contains remote voice":
  the manager records each step's outcome separately and can end in
  `AUDIO_UNAVAILABLE` (open failed/silenced) or `REMOTE_SPEECH_NOT_ISOLATED`
  (audio present but attribution to the remote party impossible).
- `isClientSilenced()` + measured RMS energy are the two on-device truth sources
  for the "opened" and "usable" steps; both are captured into diagnostics.
- Priority order to attempt: privileged call sources (expected step-2/3 failure,
  recorded as structured evidence) → accessibility-exempt mic capture (if the
  user explicitly enabled it) → ordinary mic capture via microphone FGS → none.
- Mixed mic audio (local + remote acoustically mixed) must **not** be sent to the
  risk pipeline as if it were the remote party alone; the attribution decision
  returns `REMOTE_SPEECH_NOT_ISOLATED` in that case.
- An accessibility service is the only documented non-preinstalled path that can
  keep capturing during an active call. It requires an explicit user action
  (enable in Settings) and must be presented as such — never silently.

## 6. Open questions that require on-device experiments (planned)

1. Does an ordinary Handshake `MIC` capture receive silence (and does
   `isClientSilenced()` return true) during a Phony call (`MODE_IN_COMMUNICATION`)?
2. Does an accessibility-service-backed capture of the same source receive audio
   in the same scenario?
3. Same two experiments with speakerphone vs earpiece routing (does remote voice
   reach the mic at all — acoustic presence)?
4. Does `VOICE_DOWNLINK` fail with `SecurityException` on this device for a
   normal app (expected yes — confirms stage-2 block empirically)?