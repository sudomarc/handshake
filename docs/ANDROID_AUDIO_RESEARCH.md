# Android Audio Access Research — Official Documentation Findings

**Date:** 2026-10-05
**Target Device:** Samsung A17 (Android 14+)
**Expo SDK:** 51 (React Native 0.74.5)

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

| Source                | Constant | Permission Required    | Third-party Access  |
| --------------------- | -------- | ---------------------- | ------------------- |
| `MIC`                 | 1        | `RECORD_AUDIO`         | ✅ YES              |
| `VOICE_RECOGNITION`   | 6        | `RECORD_AUDIO`         | ✅ YES              |
| `VOICE_COMMUNICATION` | 7        | `RECORD_AUDIO`         | ✅ YES              |
| `UNPROCESSED`         | 5        | `RECORD_AUDIO`         | ✅ YES              |
| `VOICE_UPLINK`        | 2        | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `VOICE_DOWNLINK`      | 3        | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `VOICE_CALL`          | 4        | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |
| `REMOTE_SUBMIX`       |          | `CAPTURE_AUDIO_OUTPUT` | ❌ NO (system only) |

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

| Capability                           | Expected Result                               |
| ------------------------------------ | --------------------------------------------- |
| Local microphone capture (`MIC`)     | ✅ WORKS                                      |
| Local microphone during carrier call | ⚠️ Likely SILENCE (call takes priority)       |
| `VOICE_UPLINK` / `VOICE_DOWNLINK`    | ❌ PERMISSION DENIED                          |
| `CallScreeningService` metadata      | ✅ WORKS (for unknown callers)                |
| `InCallService` audio state          | ❌ REQUIRES DEFAULT DIALER                    |
| Background microphone FGS            | ❌ CANNOT START FROM BACKGROUND (Android 14+) |

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
