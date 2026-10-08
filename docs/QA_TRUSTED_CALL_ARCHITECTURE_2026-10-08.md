# QA — Trusted-call architecture, installed-APK device run (2026-10-08)

Scope: test-only run against the installed APK (no rebuild, no code changes unless device
evidence proved a defect). Test-first rule applied: defects are recorded here, not patched.

## Device

| Item | Value |
|---|---|
| Model | Samsung SM-A175F (`RFGL516YXCB`), battery 79% |
| OS | Android 16 / API 36 |
| Package | `com.sudomarc.handshake`, versionName `0.1.0` (versionCode 1) |
| Install | first 2026-10-06, last update 2026-10-08 00:32 (accepted as current build per repo owner) |
| Fake-call app | Phony `com.upnp.fakeCall` (incoming/active/ended only, no outgoing) |
| Service | `HandshakeOverlayService` foreground (id 1002); overlay permission `allow` |
| Commit under test | `2d1e200` |

## Test matrix

| # | Test | Result | Evidence |
|---|---|---|---|
| T1 | Home screen copy | PASS | "Protection ready", honest no-audio wording, no MyCode / spoken-code / Check-a-call |
| T2 | Trusted-people list (fresh) | PASS | Empty after reinstall (SecureStore cleared) — expected |
| T3 | Create trusted person | PASS | "QATest" persisted; connection ID `85b603821e5422ff48ca41ae7824b5f6` + Share shown |
| T4 | Person detail / enrollment | FAIL | "Confirmed phones" card: **`Request failed (404).`** |
| T5 | Deployed backend trust routes | FAIL | `handshake-pi-amber` **and** `handshake-patrickk2s` both return Next.js HTML 404 for `/api/trust/circle`; old `/api/code/current` alive (400). Trust backend not deployed |
| T6 | Call permission on fresh install | FAIL | `READ_PHONE_STATE: granted=false`; app requests only `POST_NOTIFICATIONS` at runtime → no overlay until manually granted. Granted via `pm grant` to continue |
| T7 | Fake incoming ringing overlay | PASS | Gray "Handshake · Phone call" pill over InCallUI with dismiss × |
| T8 | Fake active-call overlay (E1 retest) | PASS | Amber **"Handshake · Verify"** — never "Protected". E1 fixed on device |
| T9 | Overlay removal on call end | PASS | No Handshake overlay window remains |
| T10 | Offline ringing/active (E2 retest) | PASS | "Phone call" → "Verify"; no false claim offline. E2 fixed on device |
| T11 | "Confirm trust with QATest" | PASS (honest failure) | Alert "Could not confirm…", no trust claimed. Copy nit: blames the peer phone rather than the unreachable trust backend |
| T12 | WhatsApp open + stability | PASS | Unlocked with owner-provided PIN; service stayed foreground; no crash |
| T13 | Real WhatsApp voice call (owner-authorized) | PASS | Overlay rendered above WhatsApp call UI: "Handshake · Verify / could not confirm both phones". `mCallState=0` (state-only, no audio). Removed after hang-up. No crash |
| T14 | Logcat crash check | PASS | No FATAL, no Handshake crash |
| T15 | Two-device mutual recognition | BLOCKED | Single device; trust backend routes undeployed |
| T16 | Real-time audio (VAD→STT→risk) | NOT PRESENT | Report: **pipeline implemented, production audio source not connected** |

Evidence screenshots: `qa/out/qa_*.png` (ringing overlays, home, Phony).

## Answers A–G

- **A. Two pre-trusted devices auto-recognize?** UNKNOWN/BLOCKED — single device, and trust routes are undeployed so even two devices could not complete it.
- **B. Overlay during active call?** YES, VERIFIED (fake incoming + real WhatsApp outgoing).
- **C. APK captures call audio?** NO — no audio source connected.
- **D. Real-time STT → risk works?** NO — pipeline code exists, no live audio path.
- **E. MyCode/spoken-code gone?** YES, VERIFIED on live UI.
- **F. Check-a-call still primary?** NO — removed from navigation entirely.
- **G. Remaining gaps:** (1) deploy `/api/trust/*` backend routes; (2) request `READ_PHONE_STATE` at runtime (fresh installs get zero overlay); (3) no automatic in-call trust trigger — nothing invokes `evaluateCallTrust` on call start (no native→JS signal), so "automatic" currently means the manual Confirm-trust button; (4) two-device E2E; (5) audio source + STT wiring; (6) `tests/trust.test.ts` is not wired into `npm test` and fails 14/30 when run directly (stale status-code expectations vs `handleApiError` 403/409 mapping) — recorded, not touched.

## Open defects (recorded, not fixed per test-first rule)

1. **Trust backend not deployed** — both Vercel deployments 404 on `/api/trust/*`.
   Symptom: "Request failed (404)." on person detail; blocks enrollment/circle/sessions.
2. **`READ_PHONE_STATE` never requested at runtime** — overlay silently absent on fresh install.
   Smallest fix: request it alongside `POST_NOTIFICATIONS` in `mobile/app/_layout.tsx`.
3. **No call-start trigger for trust evaluation** — no native→JS call-state event; overlay falls back to Verify detail carried from the last manual check.

## Regression status vs `docs/ANDROID_FAKE_CALL_QA_2026-10-07.md`

- E1 (false "Handshake Protected"): fixed on device (T8).
- E2 (false Protected offline): fixed on device (T10).
- F4 (Verify dead-end): old Check-a-call flow unreachable; new native risk card
  (Dismiss / Trusted people) could not be triggered on device → card buttons UNVERIFIED.
