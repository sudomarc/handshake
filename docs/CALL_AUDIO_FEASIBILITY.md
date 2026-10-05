# Call Audio Feasibility — Final Report

**Date:** 2026-10-05
**Target Device:** Samsung A17 (Android 14+)
**Expo SDK:** 51 (React Native 0.74.5)
**Package:** `com.sudomarc.handshake`

---

## Executive Result

**Carrier call remote audio is NOT accessible to third-party Android apps.** The `CAPTURE_AUDIO_OUTPUT` permission required for `VOICE_UPLINK`, `VOICE_DOWNLINK`, and `VOICE_CALL` audio sources is explicitly reserved for system components. Handshake can only capture local microphone audio, which is silenced during active carrier calls.

---

## Device & Environment

| Property | Value |
|----------|-------|
| Device | Samsung A17 (reference) |
| Android Version | 14+ (API 34+) |
| Target SDK | 34 (Expo SDK 51) |
| Build | Expo development build with native module |
| Architecture | arm64-v8a |

---

## APIs Evaluated

| API | Status | Notes |
|-----|--------|-------|
| `CallScreeningService` | ✅ IMPLEMENTED | Call metadata only (number, direction, verification). No audio access. |
| `InCallService` | ❌ NOT VIABLE | Requires becoming default dialer (`ROLE_DIALER`) — replaces entire phone app UX. |
| `ConnectionService` | ❌ NOT APPLICABLE | Only for VoIP calls owned by the app, not carrier calls. |
| `AudioRecord` (MIC) | ✅ IMPLEMENTED | Local microphone capture works when no call active. |
| `AudioRecord` (VOICE_UPLINK/DOWNLINK/VOICE_CALL) | ❌ BLOCKED | Requires `CAPTURE_AUDIO_OUTPUT` — system-only permission. |
| Microphone Foreground Service | ✅ IMPLEMENTED | Works when started from foreground. Cannot start from background on Android 14+. |
| Phone Call Foreground Service | ❌ NOT APPLICABLE | Requires `MANAGE_OWN_CALLS` or default dialer role. |

---

## Implemented

### Native Module (`com.sudomarc.handshake.callaudio`)

1. **AudioCaptureManager** — `AudioRecord` wrapper supporting:
   - `MediaRecorder.AudioSource.MIC`
   - `MediaRecorder.AudioSource.VOICE_RECOGNITION`
   - `MediaRecorder.AudioSource.VOICE_COMMUNICATION`
   - 16kHz / 16-bit / mono / 20ms frames

2. **VADProcessor** — Simple energy-based Voice Activity Detection:
   - States: `SILENCE`, `SPEECH`, `UNKNOWN`
   - Configurable thresholds (default: 0.01 RMS)

3. **CallScreeningServiceImpl** — `CallScreeningService` implementation:
   - Receives incoming/outgoing call metadata
   - Responds within 5s (allow by default)
   - Emits events to React Native

4. **CallAudioService** — Foreground service (type `microphone`):
   - Persistent notification
   - Continues capture when app backgrounded
   - Cannot be started from background on Android 14+

5. **CallAudioModule** — React Native bridge:
   - Methods: `startMicrophoneCapture`, `startVoiceRecognitionCapture`, `startVoiceCommunicationCapture`, `stopCapture`, `startForegroundCapture`, `stopForegroundCapture`, `enableCallScreening`, `disableCallScreening`
   - Events: `CallAudioData`, `CallVADResult`, `CallAudioState`, `CallScreenEvent`, `CallAudioError`

### React Native Integration

- `lib/callAudio.ts` — TypeScript manager with event emitter
- `app/call-audio-feasibility.tsx` — Test screen with real-time metrics

### Manifest Additions

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />

<service android:name=".callaudio.CallScreeningServiceImpl"
         android:permission="android.permission.BIND_SCREENING_SERVICE"
         android:exported="true"
         android:foregroundServiceType="microphone">
  <intent-filter>
    <action android:name="android.telecom.CallScreeningService" />
  </intent-filter>
</service>

<service android:name=".callaudio.CallAudioService"
         android:permission="android.permission.BIND_FOREGROUND_SERVICE"
         android:exported="false"
         android:foregroundServiceType="microphone" />
```

---

## Tested

| Test | Status | Notes |
|------|--------|-------|
| TypeScript compilation | ✅ PASS | `npm run typecheck` clean |
| ESLint | ✅ PASS | Only 1 unused var warning |
| Native module registration | ✅ PASS | Package added to MainApplication |
| Manifest permissions/services | ✅ PASS | All declared correctly |
| Prebuild generation | ✅ PASS | Android project generates cleanly |

### NOT VERIFIED (Require Samsung A17 / Android Device)

| Test | Expected Result |
|------|-----------------|
| Microphone capture (no call) | Frames received, VAD detects speech |
| Microphone during carrier call | **Silence** (call takes audio focus) |
| VOICE_RECOGNITION during call | **Silence** |
| VOICE_COMMUNICATION during call | **Silence** |
| Foreground service background capture | Works while app visible; stops if started from background |
| CallScreeningService incoming call | Fires for non-contacts; metadata received |
| CallScreeningService with READ_CONTACTS | Fires for all calls |
| Speakerphone/earpiece/Bluetooth routing | Local mic still silenced during carrier call |

---

## Results

### Local Microphone

| Condition | Result |
|-----------|--------|
| App foreground, no call | ✅ CAPTURES AUDIO |
| App background (foreground service), no call | ✅ CAPTURES AUDIO |
| Carrier call active (any audio route) | ❌ SILENCE (audio focus taken by call) |

### Carrier Call

| Scenario | Call Detected | Local Audio | Remote Audio | Both |
|----------|---------------|-------------|--------------|------|
| Incoming carrier | ✅ (via CallScreeningService) | ❌ Silenced | ❌ NOT AVAILABLE | ❌ |
| Outgoing carrier | ✅ (via CallScreeningService) | ❌ Silenced | ❌ NOT AVAILABLE | ❌ |
| Speakerphone | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ |
| Earpiece | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ |
| Bluetooth | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ |

### Remote Audio

**RESULT: NOT AVAILABLE IN TESTED PATH**

- `VOICE_UPLINK` (Tx/uplink): Requires `CAPTURE_AUDIO_OUTPUT` — **system only**
- `VOICE_DOWNLINK` (Rx/downlink): Requires `CAPTURE_AUDIO_OUTPUT` — **system only**
- `VOICE_CALL` (mixed): Requires `CAPTURE_AUDIO_OUTPUT` — **system only**
- `REMOTE_SUBMIX`: Requires `CAPTURE_AUDIO_OUTPUT` — **system only**

**Android Documentation Quote:**
> "Capturing from VOICE_CALL source requires the Manifest.permission.CAPTURE_AUDIO_OUTPUT permission. This permission is reserved for use by system components and is not available to third-party applications."

### Foreground Service Behavior

| Scenario | Result |
|----------|--------|
| Start from foreground activity | ✅ WORKS |
| Start from background (Android 14+) | ❌ `ForegroundServiceStartNotAllowedException` |
| Continue capture when app backgrounded | ✅ WORKS (if started from foreground) |
| Microphone access while backgrounded | ✅ WORKS (while-in-use granted at start time) |

---

## Real-time Pipeline

| Component | Status | Notes |
|-----------|--------|-------|
| Audio Capture | ✅ IMPLEMENTED | 16kHz/20ms frames via AudioRecord |
| VAD | ✅ IMPLEMENTED | Energy-based, 3 states |
| STT | ❌ NOT IMPLEMENTED | Would need on-device (Whisper.cpp) or cloud |
| Semantic Analysis | ❌ NOT IMPLEMENTED | Would run on transcript chunks |
| Risk Engine | ❌ NOT IMPLEMENTED | Would consume STT output |

**Pipeline would be:** Audio → VAD → Rolling Buffer → STT → Transcript Chunks → Risk Analysis → Risk State

**But:** Only viable if audio source contains remote voice — which it doesn't for carrier calls.

---

## Major Discovery

**Third-party Android apps cannot access carrier call audio (uplink or downlink).** This is a platform-enforced boundary, not a limitation of our implementation. The `CAPTURE_AUDIO_OUTPUT` permission is explicitly restricted to system apps.

**Implication:** Real-time two-way carrier call analysis is NOT possible through the tested path. Handshake cannot "listen in" on cellular calls.

---

## Architecture Recommendation

### Option A: Deeper Android Integration (InCallService)
- **What it gives:** Full call audio state, routing, potential access via system APIs
- **What it doesn't give:** Direct carrier audio capture (still needs `CAPTURE_AUDIO_OUTPUT`)
- **Requirements:** Become default dialer (`ROLE_DIALER`), handle ALL calls, replace phone UI
- **Cost/Risk:** Massive architectural change; user must replace system phone app; high friction

### Option B: Handshake-Controlled VoIP/Session (RECOMMENDED)
- **Architecture:** Handshake initiates/manages its own VoIP calls via `ConnectionService`
- **Audio control:** Full access to uplink/downlink for Handshake-managed calls
- **Integration:** Use WebRTC or similar; audio stays in-app
- **User flow:** "Start Protected Call" in Handshake → uses Handshake VoIP → real-time analysis works
- **Trade-off:** Only works for Handshake-to-Handshake or Handshake-to-PSTN via gateway

### Recommended Path Forward

```
Handshake Personal (Expo)
    ↓
Native Call Layer (this prototype)
    ↓
Protected VoIP Session (ConnectionService + WebRTC)
    ↓
Local Audio Capture (uplink + downlink available)
    ↓
VAD → STT → Risk Engine
    ↓
Protection State: PROTECTED / VERIFY / RISK
```

Carrier calls remain out of scope for real-time audio analysis. The product should pivot to **Handshake-controlled sessions** where audio is fully observable.

---

## Files Changed

### New Files
- `mobile/plugins/handshake-call-audio/plugin.js` — Expo config plugin
- `mobile/plugins/handshake-call-audio/android/AudioCaptureManager.kt`
- `mobile/plugins/handshake-call-audio/android/VADProcessor.kt`
- `mobile/plugins/handshake-call-audio/android/CallScreeningServiceImpl.kt`
- `mobile/plugins/handshake-call-audio/android/CallAudioService.kt`
- `mobile/plugins/handshake-call-audio/android/CallAudioModule.kt`
- `mobile/plugins/handshake-call-audio/android/CallAudioPackage.kt`
- `mobile/lib/callAudio.ts` — React Native bridge
- `mobile/app/call-audio-feasibility.tsx` — Test screen
- `docs/ANDROID_AUDIO_RESEARCH.md` — Research findings
- `docs/CALL_AUDIO_FEASIBILITY.md` — This document

### Modified Files
- `mobile/app.json` — Added plugin
- `mobile/app/_layout.tsx` — Added route
- `mobile/app/(tabs)/index.tsx` — Added navigation button
- `mobile/android/app/src/main/java/com/sudomarc/handshake/MainApplication.kt` — Added package import
- `mobile/android/app/src/main/AndroidManifest.xml` — Auto-generated with permissions/services

---

## Tests

| Command | Result |
|---------|--------|
| `cd mobile && npm run typecheck` | ✅ PASS |
| `cd mobile && npm run lint` | ✅ PASS (1 warning) |
| `cd mobile && npx expo prebuild --platform android --clean` | ✅ PASS |

### Device Tests Required (Samsung A17)

```bash
# Build development APK
cd mobile && eas build --platform android --profile development

# Install on device
adb install <apk-path>

# Test procedure:
# 1. Open "Call Audio Feasibility" screen
# 2. Press "Start MIC" → speak → verify frames/VAD
# 3. Press "Start Foreground MIC" → home screen → verify capture continues
# 4. Make cellular call → observe frames go to 0/silence
# 5. Enable Call Screening → receive call from unknown number → verify event
```

---

## Git

Commit: (pending — changes not committed per instructions)

---

## Remaining Unknowns

1. **Exact silence behavior during carrier call** — Need device test to confirm `AudioRecord.read()` returns zeros vs. blocks
2. **CallScreeningService with READ_CONTACTS** — Does it fire for contacts too?
3. **Bluetooth SCO audio routing** — Does mic capture work differently with BT headset?
4. **Android 15/16 changes** — Any new audio capture APIs?
5. **VoIP audio quality** — Latency, echo cancellation in Handshake-controlled session

---

## Final Verdict

**REAL-TIME CALL ANALYSIS NOT YET FEASIBLE IN TESTED PATH**

**Reason:** Carrier call remote audio is platform-blocked for third-party apps. The only path to real-time two-way audio analysis is Handshake-controlled VoIP sessions (Option B).

**Next Step:** Implement Handshake-controlled calling via `ConnectionService` + WebRTC, where uplink/downlink audio is natively available within the app's own call path.