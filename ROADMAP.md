# Roadmap — ForgeHacks 2026 (Oct 3 → Oct 10)

**Deadline: Saturday, Oct 10, 2026, 12:00 PM EDT** (Devpost).
**Target submission: Friday, Oct 9, well before noon EDT.**

Devpost note: planned maintenance Oct 7, 6:00 AM UTC / 2:00 AM ET — irrelevant to
us since we submit Oct 9, but do not schedule the final push on Oct 7 morning.

## Verified ForgeHacks submission requirements

Source checked against the current Devpost pages on 2026-10-04:
- https://forgehacks-2026.devpost.com/
- https://forgehacks-2026.devpost.com/rules

ForgeHacks requires:
- a **working AI-powered project** addressing a real-world problem;
- a public **demo video of 2–4 minutes max** showing the problem and how the
  project works;
- a GitHub repository with source code and a clear README;
- written project information covering problem/target users, technical approach,
  and real-world impact;
- supporting screenshots, architecture diagram, or deployment/testing link.

The judging rubric explicitly includes **Execution & Completeness**:
working demo, polish, usability, and how much was shipped. Missing the required
video or code makes a submission ineligible.

This project therefore follows a strict evidence rule:
**never present a simulated click-through or prerecorded result as live
functionality.** A prerecorded clip or screenshot is a fallback/presentation
aid unless the live feature is independently verified.

## Finalization / freeze status (audited 2026-10-05)

**From now on: no new features.** Minimum change, maximum certainty.
Status tags: **VERIFIED** (observed during the 2026-10-05 audit), **OWNER-REPORTED**
(stated by the developer, no evidence in the repository), **NOT VERIFIED**,
**KNOWN LIMITATION**. This section supersedes the unchecked boxes of J6/J7 below
until they are re-checked with evidence.

> **Update 2026-10-08 — pairing rework.** The product flow has moved to **QR-based
> physical pairing** (two phones together → scan → both confirm → automatic
> recognition during calls). The rotating spoken code, MyCode/codes screens,
> pairId-as-user-secret, Check-a-call manual flow and "Default trusted person"
> concept are **retired**; the trust protocol + QR invitations replace them.
> Items below that reference the rotating code are retained as history and are
> no longer targets for new verification. See
> `docs/TRUSTED_CALL_ARCHITECTURE.md` for the current architecture.

### COMPLETED

- VERIFIED — mobile/ Expo app with trusted people, QR pairing surface, the device-to-device trust/session flow and the honest overlay states. Typecheck/lint were previously clean on the mobile project. *(The earlier "shared rotating-code verification" version of this item is retired by the 2026-10-08 pairing rework.)*
- VERIFIED on device — app startup, trusted-person creation, rotating-code generation, correct-code verification, wrong-code rejection, Pressure Check and Personal Question reached the deployed backend on the Samsung A17. *(Rotating-code verification remains implemented server-side for compatibility but is no longer the primary user flow.)*
- VERIFIED — the Android overlay can be enabled for warnings above other apps.
- VERIFIED — the mobile product no longer contains the Handshake-to-Handshake WebRTC call screen or WebRTC client dependency.
- COMPLETED — the developer's own consented voice clone has been generated for the demo.
- FIXED — Pressure Check no longer exposes human-likelihood or clone verdicts. Its result is limited to pressure score, risk level and reasoning.
- FIXED — Personal Challenge can use a saved private verification detail from the trusted-person profile instead of falling back to a generic mobile context.
- KNOWN LIMITATION — the Android overlay observes carrier phone-call state, but third-party apps such as WhatsApp do not expose their private two-way audio to Handshake through the current integration. *(The manual "Check a call" fallback this limitation used to point to has been removed from the mobile navigation; recognition states still require the backend.)*

### ON-DEVICE HISTORY

The 2026-10-06 device report recorded two fatal crashes in the retired WebRTC/audio prototype. Those components have since been removed from the mobile product. The report remains archived as historical evidence and must not be treated as current shipped behavior.

### Android fake-call QA gate

The repeatable QA handoff and current test matrix are maintained in [docs/ANDROID_FAKE_CALL_QA_2026-10-07.md](./docs/ANDROID_FAKE_CALL_QA_2026-10-07.md). Device results must be recorded there before any call/overlay behavior is marked VERIFIED.

## FINAL VALIDATION (open before submission)

- [ ] Rebuild the final Android APK from this branch.
- [ ] Install the APK on the Samsung A17 and verify startup with no native crash.
- [ ] Verify QR pairing end-to-end: create invite → scan → accept → confirm → mutual enrollment.
- [ ] Verify the invitation is single-use and expires; a used/expired invite cannot pair again.
- [ ] Verify automatic recognition during a call: paired phone → **Trusted connection**; unpaired/offline → **Verify** (never a false "Protected").
- [ ] Verify Pressure Check and Personal Question against the deployed backend.
- [ ] Verify overlay permission onboarding and the carrier-call warning pill.
- [ ] Verify the trust backend (`/api/trust/*`) is deployed and reachable from the APK.
- [ ] Rehearse DEMO_SCRIPT.md, including one deliberate network failure.
- [ ] Run the existing voice clone through a commercial detector and record only the observed result.
- [ ] Final README/demo evidence pass.
- [ ] Record the public 2–4 minute demo video.
- [ ] Submit on Devpost before 12:00 PM EDT on Oct 10, 2026.

### Current audit findings

- F1 — FIXED. Pressure Check now describes pressure risk only; no human-likelihood or clone classification is exposed.
- F2 — FIXED. Mobile trusted-person profiles now support a private verification detail, which is supplied to the personal-question capability when escalation occurs.
- F3 — FIXED 2026-10-07. AI routes use client-IP and pair-based rate-limit buckets.
- F4 — FIXED. Product documentation now reflects the Personal mobile product and the communication-companion model.
- F5 — NOT VERIFIED. Expo Doctor's external checks still require a development environment with access to api.expo.dev.
- F6 — NOT VERIFIED. The production web build has not been reproduced in this environment.
- F7 — LOW PRIORITY. Baseline formatting cleanup remains separate from product correctness.
- F8 — POST-HACKATHON. The production EAS profile environment variable remains separate from the preview APK used for the hackathon.

### Submission validation

The checklist above is the single current pre-submission checklist. Historical audit notes below are retained only when they explain a current limitation.

### J5 — Wed Oct 7: Personal-first redesign + demo ✅

> Superseded in part by the 2026-10-08 pairing rework: items about the rotating
> code UI and "Protected" wording are retained as history. The current flow is
> QR pairing + automatic recognition with Trusted / Verify / Risk detected.

- [x] Home page centered on one primary verification action
- [x] Trusted people flow uses human language
- [x] Verification flow uses clear instructions and a large code field *(retired — replaced by QR pairing)*
- [x] Caller code is large and readable with a rotation countdown *(retired — no codes)*
- [x] Internal risk checks are orchestrated by the shield engine
- [x] Simplified status language to Trusted / Verify / Risk detected
- [x] Removed WebRTC-only Call Protection from the mobile product
- [x] Kept optional Android overlay for warnings above phone/calling apps
- [x] Clone of the developer's own voice generated with consent
- [ ] Run the existing voice clone through a commercial detector and record the observed result
- [ ] Build the contrast only from observed detector evidence
- [ ] Record the final 2–4 minute demo video

### J6 — Thu Oct 8: Protection companion + QA

> The manual **Check a call** item below is retired: the flow was removed from
> mobile navigation (verified in the 2026-10-08 QA run). The overlay/recognition
> states now come from the trust backend.

- [x] Keep ordinary operator calls as the primary phone-call surface
- [x] Do not replace the system phone UI with a Handshake-only call
- [x] Remove the Handshake-to-Handshake WebRTC call product
- [x] Add clear overlay-permission onboarding
- [x] Keep manual **Check a call** for phone calls, WhatsApp and other third-party calling apps *(retired by the 2026-10-08 pairing rework — removed from navigation)*
- [x] Keep Pressure Check and Personal Challenge behind one shield experience
- [ ] Finalize overlay behavior on the Samsung A17
- [ ] Verify carrier call-state awareness on the release APK
- [ ] Verify warning overlay appears above the phone app
- [ ] Verify QR pairing + automatic recognition end-to-end on two devices *(replaces the retired manual-check item)*
- [ ] Final UI polish: spacing, contrast, hierarchy, error and loading states

**Important boundary:** Handshake does not automatically receive private two-way audio from
ordinary operator calls or third-party apps such as WhatsApp. Do not claim live audio
analysis for those surfaces unless independently verified.

### J7 — Fri Oct 9: final QA + demo + submit

- [ ] Full manual test pass on the mobile app
- [ ] Build and install the final Android APK
- [ ] Verify startup, trusted people, QR pairing, mutual confirmation, recognition states
- [ ] Verify Pressure Check and Personal Challenge against the deployed backend
- [ ] Verify overlay permission flow and warning UI
- [ ] Test one deliberate network failure
- [ ] Record the cleanest real demo
- [ ] Final public demo video, **2–4 min maximum**
- [ ] Final README/project description and evidence
- [ ] Confirm GitHub repo is public and the mobile source is included
- [ ] Submit on Devpost before **12:00 PM EDT on Oct 10, 2026**

## Hackathon platform decision

**Decision recorded 2026-10-07:** Handshake Personal is a companion layer for ordinary
phone calls and third-party calling apps. Handshake does not replace the phone app,
and the mobile product no longer contains a Handshake-to-Handshake WebRTC call screen.

The existing Next.js web app remains the working web prototype and API reference.
The mobile product keeps the device-to-device trust model (QR pairing + automatic
recognition), the shield orchestration, and the optional Android warning overlay.

## Post-hackathon product direction

1. Continue Handshake Personal as the Android-first trust companion.
2. Keep the web product as the basis for Handshake Business after the hackathon.
3. Keep one shared Handshake Core/API for verification and risk policy.
4. Move internal checks behind an orchestration layer instead of exposing a toolbox.
5. Add accounts, durable/distributed trust storage, recovery flows and abuse
   controls before consumer security claims.

## Post-hackathon roadmap — communication companion

### Phase 1 — Stable protection layer
- Finish Samsung A17 release validation.
- Make overlay permission setup explicit and reversible.
- Keep carrier call-state awareness separate from audio analysis.
- Complete the automatic recognition loop beside WhatsApp and other calling apps
  (replaces the retired manual "Check a call" flow).

**Exit:** the user can reliably protect a phone interaction without replacing the
calling application.

### Phase 2 — Evidence-driven risk orchestration
- Combine pressure signals, trusted-person context and user input.
- Select the smallest useful check automatically.
- Keep the user-facing states to **Trusted / Verify / Risk detected**.
- Trigger the smallest contextual action: verify, challenge or recovery guidance.

**Exit:** one clear action is presented instead of multiple security tools.

### Phase 3 — Supported audio analysis
Only implement this for a communication surface whose audio is legitimately exposed
to the application.

Pipeline:
**audio → VAD → short buffer → STT → pressure analysis → risk engine → action**

Do not send raw audio continuously to the model, and do not claim carrier or WhatsApp
audio access without independent device/platform evidence.

**Exit:** a measured, supported audio path exists.

### Phase 4 — Production trust model
- Real accounts
- Durable device enrollment and revocation
- Persistent encrypted trust relationships
- Durable/distributed abuse controls
- Privacy and retention controls
- Clear recovery flows after suspected fraud

### Product UX target

Outside active interaction:
**Protection ready**
→ trusted people
→ recent activity
→ privacy/settings

During an interaction:
**Trusted connection**
→ **Verify**
→ **Risk detected**

The user should not need to know whether Handshake used Pressure Check, Personal
Challenge or another internal capability. The product chooses the check and presents
the next useful action.

## Legacy technical research

The Android audio-feasibility research remains archived in `docs/CALL_AUDIO_FEASIBILITY.md`. It established that ordinary carrier-call remote audio is not available to the tested third-party app path. It is retained as evidence, not as a shipped feature.

The former internal call prototype and experimental audio path have been removed from the current product. Any future supported audio architecture must be independently verified before implementation.
