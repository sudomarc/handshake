# Android On-Device Test Report — 2026-10-06

Real-device ADB test pass against the GitHub Actions release APK built from
`1bba6c6`. Everything below was observed on the phone; nothing is inferred from
source review alone unless explicitly labelled.

## Test environment

| Item | Value |
| --- | --- |
| Device | Samsung SM-A175F (`RFGL516YXCB`) |
| Android | 16 (API 36) |
| ADB | 37.0.1-15733141 |
| Build under test | `com.sudomarc.handshake` 0.1.0, installed 2026-10-06 03:49 |
| CI source | run `37408976681`, artifact `handshake-apk`, head_sha `1bba6c6` |
| Backend URL baked into APK | `https://handshake-pi-amber.vercel.app` |
| Network | device on Wi-Fi |
| Second device / emulator | none available |

Repo synced to `origin/main` = `1bba6c6` before testing
(`057e4b4 → 1bba6c6`, fast-forward).

## PASS — observed on the device

| # | Test | Evidence |
| --- | --- | --- |
| 1 | Application startup | `MainActivity` resumed and focused; no fatal at launch |
| 2 | Home / Personal screen | Hero, **Verify a person**, *More tools*, `Verify` / `Trusted` tabs render |
| 3 | Trusted-person flow | **Create a new connection** → pair `849d3b149d0cf133d5c9018995147c38`, "Mom" shown as *Active* |
| 4 | Backend connectivity | Deployed Vercel API reached from the phone (circle, current, verify, analyze, challenge) |
| 5 | Rotating-code generation | `771 794` → `537 378` across a window boundary; server-anchored countdown observed |
| 6 | Verification — wrong code | `111111` → **Not verified** + "do not send money / hang up and call back" guidance |
| 7 | Verification — correct code | `967823` → **Verified** (read → type → check loop completed in <8 s) |
| 8 | Microphone permission | System `RECORD_AUDIO` dialog appeared and was granted; `RECORD_AUDIO granted=true`, `FOREGROUND_SERVICE_MICROPHONE granted=true` |
| 9 | Pressure check (AI) | "Hi this is Mom I need money now send it urgently and do not tell anyone" → **Likely clone / scam pressure**, pressure `95/100`, human `10/100`, with real reasoning |
| 10 | Personal question (AI) | Returned a real question + `personal / medium` labels |
| 11 | WebRTC library init | `jingle_peerconnection_so` loaded, `PeerConnectionFactory` initialized, audio device module created at app start |
| 12 | Call Protection — signalling + local audio (partial) | `pc ctor` → `getUserMedia(audio)` → `MediaStream id` → `addTrack` → `createOffer OK` → `setLocalDescription OK` → `onIceGatheringChangeGATHERING` |

Item 12 stops at ICE gathering because of FAIL-1 below.

## FAIL — observed on the device

### FAIL-1 — Call Protection crashes the app (fatal, reproduced twice)

```
FATAL EXCEPTION: main
java.lang.ClassCastException: com.oney.WebRTCModule.RTCVideoViewManager
  cannot be cast to com.facebook.react.uimanager.ViewGroupManager
    at com.facebook.react.uimanager.NativeViewHierarchyManager.manageChildren(...)
    at com.facebook.react.uimanager.UIViewOperationQueue$ManageChildrenOperation.execute(...)
```

- **Reproduced:** PIDs `28252` and `28557`, both immediately after
  `getUserMedia` succeeded (i.e. right after the mic permission was granted).
- **Root cause — code bug:** `mobile/app/call/protection.tsx` passed children
  (the `videoOverlay` label block) into `<RTCView>`.
  `RTCVideoViewManager` in `react-native-webrtc` extends
  `SimpleViewManager<WebRTCView>`, **not** `ViewGroupManager`, so React Native
  cannot manage children for it and throws while committing the view tree.
- **Consequence:** the app dies in the first render frame of the active-call
  view. The SDP offer is never POSTed, so remote answer, remote ICE, remote
  audio track, mute/unmute, end call and connection-state transitions are all
  unreachable.
- **Not** a device or platform limitation.
- **Fix applied (unverified):** overlay children moved out of `<RTCView>` into a
  positioned wrapper `View` in `mobile/app/call/protection.tsx`.

### FAIL-2 — Call Audio Feasibility screen crashes the app (fatal)

```
FATAL EXCEPTION: mqt_native_modules
java.lang.RuntimeException: Cannot convert argument of type class java.util.LinkedHashMap
    at com.facebook.react.bridge.Arguments.fromJavaArgs(Arguments.java:191)
    at com.facebook.react.bridge.CallbackImpl.invoke(CallbackImpl.java:31)
    at com.facebook.react.bridge.PromiseImpl.resolve(PromiseImpl.java:56)
    at com.sudomarc.handshake.callaudio.CallAudioModule.getAudioConfig(CallAudioModule.kt:103)
```

- **Root cause — code bug:** the module resolved promises and emitted events
  with plain Kotlin `Map` / `ShortArray` values. The React Native bridge only
  accepts `WritableMap` / `WritableArray`, so `Arguments.fromJavaArgs` throws.
  The same pattern existed in `startMicrophoneCapture`,
  `startVoiceRecognitionCapture`, `startVoiceCommunicationCapture`,
  `stopCapture`, `startForegroundCapture`, `stopForegroundCapture`,
  `getAudioConfig`, `isRecording`, `enableCallScreening`,
  `disableCallScreening` and every `sendEvent` payload (audio frames, VAD
  results, call-screen events).
- **Fix applied (unverified):** added `resolveWith(...)` /
  `toWritableMap(...)` marshalling helpers in
  `mobile/android/.../callaudio/CallAudioModule.kt` and routed every promise
  resolution and event emission through them.

### FAIL-3 — Pressure check, first attempt (transient, not reproducible)

First submit returned HTTP 400 `"That input doesn't look right. Please check it
and try again."` (`lib/http.ts:15`, the Zod branch). An identical retry with the
same transcript succeeded. Classified as a one-off model-output schema failure
that the server-side retry did not absorb — **not** a reproducible defect, but
it is a real user-visible failure mode.

## BLOCKED — could not be tested

| Test | Reason |
| --- | --- |
| Two-device WebRTC call (offer/answer, remote audio track, two-way audio) | Only `RFGL516YXCB` attached; no emulator binary installed and no second physical device |
| Remote audio track, mute/unmute, end call, connection-state transitions | Unreachable: FAIL-1 crashes before the offer is POSTed |
| Rebuild + re-verify after the two fixes | No local JDK; the only build path is the GitHub Actions workflow |
| Carrier-call audio claims | Not attempted — out of scope per `AGENTS.md` and the roadmap feasibility gate |

## Fix status at time of report

| Fix | File | Built? | Verified on device? |
| --- | --- | --- | --- |
| Remove children from `<RTCView>` | `mobile/app/call/protection.tsx` | No | No |
| Bridge marshalling (`WritableMap`/`WritableArray`) | `mobile/android/app/src/main/java/com/sudomarc/handshake/callaudio/CallAudioModule.kt` | No | No |

Both fixes are correctness fixes for observed fatal crashes. They must be
rebuilt (CI `android-apk` workflow) and re-tested on the device before anything
here can be promoted to **VERIFIED**.

## NEXT

Build an APK containing both fixes, install it over ADB, and re-run:

1. Call Protection → create → confirm no crash, `connected` state, local audio
   track, then remote audio track, mute/unmute and end call.
2. Call Audio Feasibility → confirm the screen opens and the config/audio/VAD
   events reach JS without bridge errors.
3. With a second device or emulator available: the full two-device WebRTC call.

Only after (1) and (3) pass can the roadmap's "two-device WebRTC call with
two-way audio confirmed on Samsung A17" target be claimed.
