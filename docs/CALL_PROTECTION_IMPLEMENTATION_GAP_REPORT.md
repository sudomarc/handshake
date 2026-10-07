# Handshake Call Protection — Implementation Gap Report

Date: 2026-10-07 · Branch audited: `main` @ `9d80677` · Method: source audit + on-device ADB verification (Samsung device, APK from CI run `37634489771`).

## 1. Executive Summary

The call-protection behavior discussed (honest three-state surface: **Protected / Verify / Risk**, clickable pill routing to verification) is **NOT implemented**. What exists on `main` today:

- a foreground service + overlay **pill that displays "Handshake Protected" during any carrier call** — a label **not justified by the implementation** (no audio analysis, no caller identity check; only call-*state* observation);
- the pill claims "Protected" **regardless of backend reachability** — even though the authoritative verification mechanism (rotating code) requires the API;
- a **Risk** card (red, "Verify now") reachable **only** via the manual Pressure Check flow;
- **no Verify state on the pill**, a **non-clickable pill**, and a `handshakeOverlayAction="verify"` intent extra that is **produced but never consumed** (dead wiring).

The gap is small and fixable within FREEZE, but none of it has been coded.

## 2. Repository / Branch Audited

- Repo `sudomarc/handshake`, branch `main`, HEAD `9d80677` ("Improve vitrine…", landing-only, does not touch `mobile/`).
- Relevant recent commits:
  - `fa51a88` fix(android): add missing HandshakeOverlayService
  - `79f976f` fix(android): wire overlay module after call-audio cleanup
  - `670c394` refactor(android): simplify protection overlay and risk actions
  - `fe505fb` fix(android): simplify call protection overlay states and risk alert
  - `904ac1e` fix(android): show protection overlay when phone call becomes active
  - `fc41986` fix: make overlay action match current navigation (1-line change, plugin copy only)
- Native overlay code exists **twice, identically** (verified by file comparison):
  - `mobile/plugins/handshake-call-audio/android/` (config-plugin source of truth)
  - `mobile/android/app/src/main/java/com/sudomarc/handshake/callaudio/` (built copy)
- `mobile/app/call/protection.tsx` does **not** exist.

## 3. What Is Actually Implemented

| Component | File | Reality |
|---|---|---|
| Foreground overlay service | `callaudio/HandshakeOverlayService.kt` | Registers `TelephonyCallback.CallStateListener`; RINGING/OFFHOOK → `showCallActive()` pill; IDLE → overlay removed. FGS type `specialUse`. |
| RN bridge | `callaudio/HandshakeOverlayModule.kt`, `CallAudioPackage.kt`, `MainApplication.kt:27` | Exposes `canDrawOverlays / openOverlaySettings / startProtection / showRisk / stopProtection`. |
| JS manager | `mobile/lib/callOverlay.ts` | Thin wrapper; used by `(tabs)/index.tsx` and `lib/shield/engine.tsx:155`. |
| Risk path | `engine.tsx submitTranscript()` → `api.analyzePressure` → `callOverlayManager.showRisk()` | Manual "Check a call" transcript → pressureScore ≥ 70 or riskLevel high → red overlay card with **Ignore** / **Verify now**. |
| Auto-arm | protection service starts itself (device-verified: `callingPackage: com.sudomarc.handshake`, uidState TOP) | Works on current APK. |
| Pair model | `mobile/lib/storage.ts` `StoredPair` | `pairId, createdAt, name?, role?, privateContext?` — **no phone number**. |

## 4. What Is Missing (discussed vs implemented)

| # | Discussed behavior | Status | Evidence |
|---|---|---|---|
| 1 | Honest pill wording (no unjustified "Protected") | NOT IMPLEMENTED | `HandshakeOverlayService.kt:190` — `text = if (ringing) "Handshake • Phone call" else "Handshake Protected"` |
| 2 | Verify state on pill for unverified carrier call | NOT IMPLEMENTED | No Verify branch in the service; only pill (call active) and Risk card exist |
| 3 | Clickable pill → opens verification flow | NOT IMPLEMENTED | Pill's only click listener is the **× close** (`:200`); pill root has no click listener |
| 4 | `handshakeOverlayAction="verify"` wired end-to-end | PARTIALLY IMPLEMENTED (dead end) | Extra **set** at `:255` (Risk card "Verify now"). Consumers: **none** — `MainActivity.kt` never reads intent extras; grep finds zero JS/native readers. The button opens the app but lands on home, not verification |
| 5 | Pill state gated on backend reachability | NOT IMPLEMENTED | The service never checks connectivity; pill claims "Protected" offline (see §6b) |
| 6 | Caller→trusted-person identity on pill | NOT IMPLEMENTED / OUT OF FREEZE | `StoredPair` has no number field; no `READ_CALL_LOG` in manifest |
| 7 | Carrier-call audio analysis | NOT IMPLEMENTED | `docs/CALL_AUDIO_FEASIBILITY.md` (Risk Engine "❌ NOT IMPLEMENTED"); no audio capture path remains in code |

## 5. Three-State Model Audit

| State | Expected | Current implementation | Status | Evidence |
|---|---|---|---|---|
| **Protected** | May exist, but must not claim analysis/protection without evidence | Pill "● Handshake Protected" (+ "Handshake • Phone call" when ringing), shown over the stock dialer during a real call | **MISLEADING CLAIM** | `HandshakeOverlayService.kt:189-207`; device test 2026-10-07: real incoming call, pill rendered above the Samsung dialer |
| **Verify** | Pill shows "Verify this caller — open Handshake", clickable, opens person verification | Nothing. Pill not clickable; no Verify visuals; deep-link extra dead | **NOT IMPLEMENTED** | No Verify path in service; `fc41986` only renamed the extra value; no consumer exists |
| **Risk** | Red card, "Verify now", opens Handshake; triggered by Pressure Check | Implemented: vibration + tone + red card, Ignore/Verify now. Trigger: manual Pressure Check only. "Verify now" opens the app but **not** the verify screen | **PARTIALLY IMPLEMENTED** | `HandshakeOverlayService.kt:209-269`; `engine.tsx:152-163` |

## 6. Caller Identity Limitation

**Caller identity cannot currently be resolved to a trusted person** without a new phone-number-association feature and potentially additional Android permissions/role requirements. Evidence: `StoredPair` (`storage.ts:7-11`) holds no number; `AndroidManifest.xml` requests `READ_PHONE_STATE` (call *state* only — the number is not delivered to `TelephonyCallback.CallStateListener`); no `READ_CALL_LOG`, no dialer role. **Not part of any FREEZE fix.**

## 6b. Backend-Reachability Limitation (added 2026-10-07, owner finding)

The rotating-code verification (the product's authoritative identity mechanism) requires the deployed API. The overlay service performs **no connectivity or backend check**: the pill displays "Handshake Protected" even in airplane mode or during an API outage — precisely the situations where verification would fail. `HandshakeOverlayService.kt` contains no network code; `AndroidManifest.xml` already includes `ACCESS_NETWORK_STATE`, so a connectivity-aware pill is possible **without any new permission**. Until then, "Protected" while offline is a second unsupported claim.

## 7. Carrier Call Analysis Limitation

No analysis of ordinary carrier-call audio exists. The WebRTC in-app call prototype was **removed** (ROADMAP: "VERIFIED — the mobile product no longer contains the Handshake-to-Handshake WebRTC call screen"; `react-native-webrtc` remains in `node_modules` only). The only analysis is server-side **Pressure Check on manually typed/pasted transcripts** (`POST /api/analyze`). Real-time carrier-call audio→STT→risk is gated behind the unexecuted feasibility prototype required by `AGENTS.md`.

## 8. UI / UX Evidence (device-verified 2026-10-07)

- **Pill**: small dark rounded bar, top-center, green dot + "Handshake Protected" (or "Handshake • Phone call" while ringing) + × close. Observed live over the Samsung dialer during a real carrier call (screenshot evidence).
- **Risk card**: dark card, red border, "HANDSHAKE" eyebrow, title, message, **Ignore** / **Verify now** buttons (`:213-268`).
- **FGS notification**: "Handshake Protection", channel `handshake_overlay`, importance LOW — confirmed in `dumpsys activity services` (foregroundId 1002, type `specialUse`).
- Owner UX finding during the live call test: the pill gives **no visible indication of any analysis or trust state** — the user cannot tell what "Protected" means or whether anything is happening. Recorded as a demo-blocking UX gap.

## 9. Git / CI / Test Evidence

- **Source**: all findings above are source-verified at HEAD.
- **Build**: `.github/workflows/android-apk.yml`; run `37634489771` on `07f51bd` succeeded (2026-10-07 14:10 UTC), artifact `handshake-apk` (24.8 MB) whose manifest declares the service (aapt-verified). Second workflow `build-handshake-android.yml` also exists.
- **Device**: that APK installed 2026-10-07 16:46 on the Samsung device; cold start OK, pair persistence OK, service auto-arm OK, pill over real call OK, airplane-mode error handling OK, kill/relaunch OK, valid/invalid/expired/rate-limited code verification OK.
- **Tests**: `mobile/plugins/handshake-call-audio/plugin.test.js` (config-plugin copy tests) and an API-route unit suite (`4df1e33`). **No tests** for pill rendering, clickability, Verify navigation, or Risk overlay.
- Source-vs-build drift risk: two identical copies of the native files must be kept in sync manually.

## 10. FREEZE Compliance Analysis

| Change | Classification |
|---|---|
| Reword pill to an honest Verify state (e.g. "Verify this caller — open Handshake") | **Allowed** — correctness of a misleading claim (AGENTS.md rules 5 & 10) |
| Make the pill clickable → route to the existing `/verify/[pairId]` flow | **Allowed** — minimal completion of an existing intended mechanism |
| Consume `handshakeOverlayAction="verify"` (MainActivity or JS router) | **Allowed** — completes existing dead wiring |
| Gate/annotate pill claim on connectivity using existing `ACCESS_NETWORK_STATE` | **Allowed** — claim accuracy, no new permission |
| Keep the Risk card as-is | No change needed |
| Phone-number↔pair matching | **New scope — forbidden in FREEZE** |
| New permissions (`READ_CALL_LOG`, dialer role) | **New scope / platform-gated — forbidden** |
| Carrier-call audio analysis | **Platform-blocked + new scope — post-hackathon** (feasibility gate per AGENTS.md) |

## 11. Minimal Corrective Plan (not implemented)

1. `showCallActive()`: change the pill label to a Verify-state wording (e.g. "Handshake — Verify this caller"), amber instead of green; do not render any "Protected" claim.
2. Add a click listener on the pill root reusing the existing launch-intent + `handshakeOverlayAction="verify"` pattern already written for "Verify now".
3. Consume the extra: in `MainActivity` (forward to JS) or JS-side initial-intent read → route to the active pair's `/verify/[pairId]` (fallback `/trusted`).
4. If the device is offline (ConnectivityManager — permission already granted), render a neutral state ("Handshake — offline") instead of any protection/verify claim.
5. Keep the Risk card untouched. No phone-number matching. No new permissions.
6. Keep documentation claims proportional: carrier-call audio is not analyzed; the pill is a prompt, not a protection claim.

## 12. Exact Files Likely To Change

| File | Why |
|---|---|
| `mobile/plugins/handshake-call-audio/android/HandshakeOverlayService.kt` | Pill wording/color + click listener + connectivity check (source of truth) |
| `mobile/android/app/src/main/java/com/sudomarc/handshake/callaudio/HandshakeOverlayService.kt` | Same change (built copy — or regenerate via the plugin to avoid drift) |
| `mobile/android/app/src/main/java/com/sudomarc/handshake/MainActivity.kt` *(option A)* | Read `handshakeOverlayAction` extra, forward to JS |
| `mobile/app/_layout.tsx` or `mobile/lib/callOverlay.ts` *(option B)* | JS-side intent handling → route to `/verify/[pairId]` |
| Docs (README/report) | Keep claims proportional to evidence |

**Must NOT change:** pair storage model, manifest permissions, Risk card behavior, API, navigation structure, foreground-service type.

## 13. Final Verdict

1. **Is the discussed implementation complete?** No. Only "a pill appears during carrier calls" exists.
2. **Which parts are missing?** Verify state on the pill, pill clickability, end-to-end `handshakeOverlayAction="verify"` routing, honest wording, backend-reachability awareness.
3. **What is misleading today?** "Handshake Protected" during ordinary calls — the implementation proves only call-*state* observation; nothing is analyzed or verified, the caller is never identified, and the claim persists even without backend connectivity.
4. **Fixable without expanding scope:** pill wording, pill click, verify deep-link wiring, connectivity-aware claim (~1–3 files).
5. **Not solvable during FREEZE:** caller↔trusted-person identity (needs number storage + possibly `READ_CALL_LOG`/dialer role) and any real-time carrier-call audio analysis (platform-blocked pending the feasibility-prototype gate in AGENTS.md).
