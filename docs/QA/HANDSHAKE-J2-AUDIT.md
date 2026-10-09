# HANDSHAKE-J2 Audit Report

**Date:** 2026-10-08  
**Commit:** c09bd32b1cbc2fb1607c798c8895ebba0bf18c69 (main)  
**Device:** Samsung SM-A175F / Galaxy A17 / Android 16 / API 36  
**Package:** com.sudomarc.handshake  

---

## EXECUTIVE SUMMARY

The Handshake Personal mobile app has a solid architectural foundation but **core call-analysis functionality is not operational** because:

1. **Trust backend routes are not deployed** (404 on both Vercel deployments)
2. **No automatic call-start trigger** connects native call detection to trust evaluation
3. **Carrier call audio is platform-blocked** — no third-party app can access remote audio on Android
4. **READ_PHONE_STATE permission not requested at runtime** — fresh installs get no overlay

---

## END-TO-END FLOW ANALYSIS

```
CALL DETECTION → CALL ACTIVE → AUDIO SOURCE → AUDIO FRAME → VAD → TRANSCRIPTION → ANALYSIS REQUEST → LLM → VERDICT → REPORT → POPUP
     ✓              ✓            ✗ BROKEN      ✗           ✗         ✗                ✗ BROKEN        ✗       ✗        ✗
```

| Stage | Status | Evidence |
|-------|--------|----------|
| CALL DETECTION | ✅ CONNECTED | Native `TelephonyCallback`/`PhoneStateListener` in `HandshakeOverlayModule.kt:216-243` and `HandshakeOverlayService.kt:152-171` |
| CALL ACTIVE | ✅ CONNECTED | Overlay service tracks `callActive`/`callRinging` state (`HandshakeOverlayService.kt:78-80, 186-208`) |
| AUDIO SOURCE | ❌ BROKEN | No `ControllableAudioSource` implementation exists; carrier audio blocked by Android (`CAPTURE_AUDIO_OUTPUT` system-only) |
| AUDIO FRAME | ❌ BROKEN | Pipeline expects frames but no source produces them |
| VAD | ⚠️ UNKNOWN | `VoiceActivityDetector` implemented in `lib/audio/pipeline.ts:122-161` but never receives frames |
| TRANSCRIPTION | ❌ BROKEN | No STT implementation; `TranscribeWindow` type exists but no production implementation |
| ANALYSIS REQUEST | ❌ BROKEN | `/api/analyze` returns 500; `analyzePressure` in `lib/featherless.ts` works but backend misconfigured |
| LLM | ⚠️ UNKNOWN | Featherless integration exists but untested due to 500 errors |
| VERDICT | ❌ BROKEN | No end-to-end flow produces a verdict |
| REPORT | ❌ BROKEN | No analysis → no report |
| POPUP | ⚠️ PARTIAL | Overlay renders during call but shows "Verify" (honest default) because trust evaluation never runs |

---

## CRITICAL FINDINGS BY COMPONENT

### 1. CALL DETECTION / POPUP (Agent A)
**Files:** `mobile/plugins/handshake-call-audio/android/HandshakeOverlayModule.kt`, `HandshakeOverlayService.kt`, `mobile/lib/callBridge.ts`, `mobile/lib/callOverlay.ts`

**Status:** ✅ Working for call-state detection and overlay rendering  
**Gap:** Native → JS events fire but **nothing subscribes to trigger trust evaluation automatically**

- `HandshakeOverlayModule.kt:78-79` registers call-state listener on `initialize()`
- Emits `HandshakeCallState` events to JS via `DeviceEventManagerModule`
- `callBridge.ts:59-77` provides `subscribeCallState()` for JS consumers
- **Root cause:** `_layout.tsx:77-88` has `CallStateAutomation` that calls `autoEvaluateCallTrust()` on call start, BUT this requires trusted pairs to exist AND the trust backend to be reachable

### 2. AUDIO / NATIVE ANDROID (Agent B)
**Files:** `mobile/plugins/handshake-call-audio/android/` (old audio capture files removed), `mobile/lib/audio/pipeline.ts`

**Status:** ❌ **Fundamentally blocked by Android platform**

- **Documented in `docs/CALL_AUDIO_FEASIBILITY.md`:** Carrier call remote audio NOT accessible
- `CAPTURE_AUDIO_OUTPUT` permission required for `VOICE_UPLINK/DOWNLINK/VOICE_CALL` — **system-only**
- Microphone capture works but is **silenced during active carrier calls** (audio focus taken by call)
- Current plugin only has `HandshakeOverlayModule` + `HandshakeOverlayService` — **no audio capture module**
- Pipeline in `lib/audio/pipeline.ts` is well-designed but `ControllableAudioSource` has **zero production implementations**

**Recommendation:** Pivot to Handshake-controlled VoIP (`ConnectionService` + WebRTC) for real-time analysis. Carrier calls cannot be analyzed.

### 3. ANALYSIS / BACKEND / LLM (Agent C)
**Files:** `app/api/analyze/route.ts`, `lib/featherless.ts`, `lib/llm.ts`, `lib/schemas.ts`, `mobile/lib/trust/session.ts`, `mobile/lib/trust/orchestrator.ts`

**Status:** ❌ **Backend routes not deployed; pipeline disconnected**

- `/api/trust/*` routes return 404 on both `handshake-pi-amber.vercel.app` and `handshake-patrickk2s-projects.vercel.app`
- `/api/analyze` returns 500 (likely missing `FEATHERLESS_API_KEY` in Vercel env)
- `runCallTrust` in `session.ts` implements mutual authentication protocol correctly
- `autoEvaluateCallTrust` in `orchestrator.ts:119-170` iterates pairs but **never invoked** because no call-start trigger
- Pressure Check LLM prompt in `featherless.ts:97-124` is well-structured with `<UNTRUSTED_TRANSCRIPT>` protection

### 4. PAIRING / QR (Agent D)
**Files:** `mobile/app/pair.tsx`, `mobile/lib/trust/api.ts`, `app/api/trust/invite/*.ts`, `lib/trustStore.ts`

**Status:** ✅ **Complete and tested** (QA T3 PASS)

- QR invite flow: create → scan → accept → confirm → both devices enrolled
- Short-lived invites (120s TTL), deep link `handshake://pair?invite=<id>`
- Server generates `pairId` internally; never shown to users
- Verified on device: "QATest" persisted with connection ID

### 5. QA / ADB / TEST INFRASTRUCTURE (Agent E)
**Files:** `docs/ANDROID_FAKE_CALL_QA_2026-10-07.md`, `docs/QA_TRUSTED_CALL_ARCHITECTURE_2026-10-08.md`

**Status:** ✅ **QA process established, device tested**

- Phony fake-call app works for incoming/ringing/active/ended
- No outgoing call support in Phony (BLOCKED)
- ADB USB works; Wi-Fi debugging not tested
- Evidence screenshots in `qa/out/`

### 6. BUILD / GITHUB ACTIONS / RELEASE (Agent F)
**Files:** `.github/workflows/android-apk.yml`, `android-qa-apk.yml`, `mobile/eas.json`

**Status:** ✅ **Build pipelines work**

- `android-apk.yml` builds release APK on push to main
- `android-qa-apk.yml` builds on PRs for QA
- EAS profiles for preview/production
- Latest artifact: `handshake-qa-apk` from workflow run

---

## ROOT CAUSES

| # | Blocker | Root Cause | Fix Owner |
|---|---------|------------|-----------|
| 1 | Trust backend 404 | Vercel deployments missing `/api/trust/*` routes | Agent F (deploy) |
| 2 | No auto trust eval on call start | `CallStateAutomation` exists but requires deployed backend + enrolled pairs | Agent A (wire) |
| 3 | READ_PHONE_STATE not requested | `mobile/app/_layout.tsx` only requests `POST_NOTIFICATIONS` | Agent A (fix permissions) |
| 4 | No carrier call audio | Android platform restriction (`CAPTURE_AUDIO_OUTPUT` system-only) | Agent B (document limitation, pivot to VoIP) |
| 5 | `/api/analyze` 500 | Missing `FEATHERLESS_API_KEY` in Vercel environment | Agent F (configure secrets) |
| 6 | No STT implementation | Not built; would need on-device (Whisper.cpp) or cloud | Agent B (future) |

---

## REPOSITORY MAP

```
UI
├── mobile/app/(tabs)/index.tsx          # Home: shield status, permissions, protection toggle
├── mobile/app/(tabs)/trusted.tsx        # Trusted people list
├── mobile/app/trusted/[id].tsx          # Person detail
├── mobile/app/pair.tsx                  # QR pairing flow (show/scan/accept)
└── mobile/components/                   # PageShell, StatusRing, UI primitives

CALL DETECTION
├── mobile/plugins/handshake-call-audio/android/HandshakeOverlayModule.kt   # Native→JS events
└── mobile/plugins/handshake-call-audio/android/HandshakeOverlayService.kt  # Overlay rendering

POPUP
├── mobile/plugins/handshake-call-audio/android/HandshakeOverlayService.kt  # Pill + risk card
└── mobile/lib/callOverlay.ts            # JS bridge to overlay module

AUDIO
├── mobile/lib/audio/pipeline.ts         # VAD → windows → STT → risk engine (no source)
└── mobile/plugins/handshake-call-audio/android/  # No audio capture module currently

TRANSCRIPTION
└── (NOT IMPLEMENTED — no STT)

ANALYSIS
├── app/api/analyze/route.ts             # Pressure Check endpoint (500)
├── lib/featherless.ts                   # LLM integration
├── mobile/lib/shield/engine.tsx         # Risk state sink (reportRisk)
└── mobile/lib/audio/pipeline.ts         # Pipeline orchestration

BACKEND
├── app/api/trust/session/route.ts       # Open session (404)
├── app/api/trust/session/[id]/route.ts  # Poll/join (404)
├── app/api/trust/circle/route.ts        # Circle status (404)
├── app/api/trust/enroll/route.ts        # Enroll device (404)
├── app/api/trust/invite/route.ts        # QR invite (404)
├── app/api/challenge/route.ts           # Challenge generation (500?)
└── lib/trustStore.ts                    # In-memory store (single-process limitation)

TRUSTED CIRCLE
├── mobile/lib/trust/session.ts          # runCallTrust, verifySessionTrust
├── mobile/lib/trust/orchestrator.ts     # evaluateCallTrust, autoEvaluateCallTrust
├── mobile/lib/trust/callState.ts        # deriveCallState (trusted/verify/risk)
├── mobile/lib/trust/api.ts              # Mobile client for trust protocol
├── mobile/lib/trust/proof.ts            # Device proof + attestation
├── mobile/lib/trust/deviceIdentity.ts   # SecureStore device id/secret
└── lib/trustCrypto.ts                   # Server-side crypto (SHA256 suffix-keyed)

QR
├── mobile/app/pair.tsx                  # ShowQrFlow / ScanQrFlow / PairingAcceptFlow
├── mobile/lib/trust/api.ts              # createInvite, getInvite, acceptInvite, confirmInvite
└── app/api/trust/invite/[id]/qr/route.ts # QR PNG endpoint

CHALLENGE
├── app/api/challenge/route.ts           # Challenge endpoint
├── lib/featherless.ts:153-162           # generateChallenge
└── mobile/lib/api.ts:100-104            # api.generateChallenge

PRESSURE CHECK
├── app/api/analyze/route.ts             # POST /api/analyze
├── lib/featherless.ts:138-150           # analyzePressure
└── mobile/lib/api.ts:94-98              # api.analyzePressure

BUILD
├── .github/workflows/android-apk.yml
├── .github/workflows/android-qa-apk.yml
├── mobile/eas.json
└── mobile/android/                      # Generated by expo prebuild

TEST
├── tests/api.test.ts
├── tests/lib.test.ts
├── tests/trust.test.ts
├── tests/pairing.test.ts
└── mobile/plugins/handshake-call-audio/plugin.test.js
```

---

## TEST PLAN

### Immediate (P0 - Must Fix Before Demo)

1. **Deploy trust backend routes** to Vercel (both projects)
   - Verify `/api/trust/ping` returns 200
   - Verify `/api/trust/circle?pairId=...` returns 200 with valid proof
   - Verify `/api/trust/session` POST creates session

2. **Fix READ_PHONE_STATE runtime request** in `mobile/app/_layout.tsx:28-47`
   - Add to `requestRuntimePermissions()` alongside `POST_NOTIFICATIONS`

3. **Wire call-start → trust evaluation**
   - Verify `CallStateAutomation` in `_layout.tsx:77-88` calls `autoEvaluateCallTrust()`
   - Ensure it runs when native `HandshakeCallState` event fires with `state: "active"`

4. **Configure FEATHERLESS_API_KEY** in Vercel for both deployments
   - Test `/api/analyze` returns valid `PressureCheckResponse`

5. **Build and install fresh APK** via GitHub Actions
   - Test on Samsung SM-A175F with Phony fake call

### Validation Tests (Run After P0 Fixes)

| Test | Expected | Evidence Required |
|------|----------|-------------------|
| Fresh install + permissions | Overlay permission requested, READ_PHONE_STATE granted | ADB `dumpsys package` |
| Incoming Phony call | Overlay appears "Handshake · Phone call" | Screenshot + logcat |
| Answer call | Overlay updates to "Handshake · Verify" (no trusted pair) | Screenshot |
| With trusted pair + backend up | Overlay shows "Handshake · Trusted connection" | Screenshot + logcat |
| Airplane mode + call | Overlay shows "Handshake · Verify" with offline reason | Screenshot |
| High-pressure transcript | Risk overlay "HANDSHAKE / Suspicious interaction" | Screenshot |
| QR pairing two devices | Both show "Trusted" in list | Screenshots both devices |

---

## AGENT DELEGATION PLAN

### Agent A — Android Call Lifecycle / Popup
**Scope:** `HandshakeOverlayModule.kt`, `HandshakeOverlayService.kt`, `callBridge.ts`, `callOverlay.ts`, `_layout.tsx` permissions
**Deliverable:** Fixed READ_PHONE_STATE request, verified call-state events → JS → trust evaluation

### Agent B — Audio / Native Android
**Scope:** Document carrier audio limitation, design VoIP pivot, verify pipeline compiles
**Deliverable:** Updated `CALL_AUDIO_FEASIBILITY.md` with proven limitations, VoIP architecture sketch

### Agent C — Analysis / Backend / LLM
**Scope:** `app/api/analyze/route.ts`, `lib/featherless.ts`, `lib/llm.ts`, `session.ts`, `orchestrator.ts`
**Deliverable:** Working `/api/analyze` endpoint, verified LLM response, trust evaluation wired

### Agent D — Pairing / QR
**Scope:** `pair.tsx`, `trust/api.ts`, `trustStore.ts`, invite routes
**Deliverable:** Verified two-device QR pairing E2E (once backend deployed)

### Agent E — QA / ADB / Test Infrastructure
**Scope:** ADB scripts, Phony test procedures, logcat capture, evidence collection
**Deliverable:** Repeatable test script for P0 validation matrix

### Agent F — Build / GitHub Actions / Release
**Scope:** Vercel deployment config, environment secrets, GitHub Actions workflows, APK build
**Deliverable:** Both Vercel projects deploying `/api/trust/*` and `/api/analyze` with secrets

---

## DEFINITION OF DONE (from AGENTS.md §27)

- [ ] Appel détecté
- [ ] Popup visible pendant l'appel
- [ ] Audio réellement reçu OU limitation technique documentée avec preuve
- [ ] Analyse réellement déclenchée
- [ ] Backend réellement utilisé lorsque nécessaire
- [ ] Verdict réellement produit
- [ ] Rapport réellement produit
- [ ] Popup mise à jour avec le résultat
- [ ] Trusted Circle intégré lorsque pertinent
- [ ] Pressure Check intégré lorsque pertinent
- [ ] Challenge intégré lorsque pertinent
- [ ] Offline correctement géré
- [ ] Pas de faux "Protected"
- [ ] Pas de "Verify" permanent
- [ ] QR pairing testé entre deux appareils
- [ ] ADB USB testé
- [ ] ADB Wi-Fi testé si device disponible
- [ ] Phony testé
- [ ] APK final construit
- [ ] APK final installé
- [ ] APK final testé
- [ ] Logs sauvegardés
- [ ] Rapport QA sauvegardé