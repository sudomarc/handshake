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

### COMPLETED

- **VERIFIED** — `mobile/` Expo app (SDK 51, Expo Router) with the Personal flows:
  trusted people, *My code*, *Verify a call*, Pressure check, Personal question,
  The first hour. `tsc --noEmit`: 0 errors. ESLint: 0 problems.
- **VERIFIED (source review)** — *Verify a call* never renders the live code
  (`mobile/app/verify/[pairId].tsx`, `mobile/components/VerifyForm.tsx`). *My code*
  shows it with a countdown, refetches at rotation, and has an error state with
  *Try again* (`useLiveCode.ts`, `CodeDisplay.tsx`). Verify errors keep the form
  usable (`VerifyForm.tsx`). Not yet observed on a device.
- **VERIFIED locally** (Next dev server, throwaway `PAIR_DERIVATION_KEY`, no AI key):
  - `POST /api/circle` → 201 with a 32-hex `pairId`.
  - `GET /api/code/current` → 200 with a valid `pairId`; 400 when missing or malformed.
  - `POST /api/code/verify` → `verified` for the current code, `not-verified` for a
    wrong code; 400 for a malformed code, invalid JSON and empty body; the 6th
    attempt for one pair inside a 30 s window → 429 with `Retry-After`.
  - `POST /api/analyze`, `POST /api/challenge` → 400 on invalid input; 503
    `not_configured` when `FEATHERLESS_API_KEY` is absent. Error bodies expose no
    internals; server logs print variable names only, never values.
- **VERIFIED** — secrets hygiene: a pattern scan of the full git history (GitHub
  tokens, `sk-`/`rc_` keys, 64-hex strings, `*_KEY=` assignments) found nothing;
  only the two `.env.example` files were ever tracked; the only `EXPO_PUBLIC_*`
  variable is `EXPO_PUBLIC_API_BASE_URL` (a URL); no secret name is referenced
  from `mobile/`.
- **VERIFIED (configuration)** — EAS `preview` profile builds an APK and injects the
  production API URL (`mobile/eas.json`).
- **VERIFIED** — GitHub repository `sudomarc/handshake` is public (GitHub API, `private: false`).

**OWNER-REPORTED, no evidence in the repository:** backend deployed on Vercel; APK
built successfully; MVP validated on a Samsung A17; deployed routes tested. To turn
these into VERIFIED, add the EAS build URL and screenshots/test notes to the repo.

### ON-DEVICE TEST RESULTS (2026-10-06)

Real ADB test pass against the release APK built by CI run `37408976681`
(head_sha `1bba6c6`) on a Samsung SM-A175F, Android 16 / API 36. Full log and
crash traces: `docs/DEVICE_TEST_REPORT_2026-10-06.md`. This section supersedes
the "Call Protection Implementation Progress" claims below, which were
source-reviewed only.

**VERIFIED on device:**

- App startup, Home/Personal screen, tab navigation — no fatal at launch.
- Trusted-person flow against the **deployed** backend: create connection →
  pair `849d3b149d0cf133d5c9018995147c38`, "Mom" active.
- Rotating-code generation: `771 794` → `537 378` across a window boundary.
- Verification: wrong code → *Not verified* + guidance; correct code →
  **Verified**.
- Microphone permission dialog shown and granted (`RECORD_AUDIO` and
  `FOREGROUND_SERVICE_MICROPHONE` both `granted=true`).
- Pressure check: real model output, scam transcript → *Likely clone / scam
  pressure*, `95/100`.
- Personal question: real model output returned.
- WebRTC native init, and Call Protection up to
  `pc ctor → getUserMedia(audio) → addTrack → createOffer → setLocalDescription
  → ICE gathering`.

**FAILED on device (fatal crashes, both reproduced):**

- **Call Protection** dies with
  `ClassCastException: RTCVideoViewManager cannot be cast to ViewGroupManager`.
  Cause: children rendered inside `<RTCView>` in `mobile/app/call/protection.tsx`
  (`RTCVideoViewManager` extends `SimpleViewManager`, so RN cannot manage
  children). The offer is never POSTed, so remote audio, mute, end call and
  connection-state transitions are untestable. **Code bug.**
- **Call Audio Feasibility** dies with
  `RuntimeException: Cannot convert argument of type class java.util.LinkedHashMap`
  at `CallAudioModule.getAudioConfig`. Cause: promises/events resolved with
  plain Kotlin `Map`/`ShortArray` instead of `WritableMap`/`WritableArray`.
  **Code bug.**
- Pressure check returned one transient HTTP 400 (`That input doesn't look
  right`); an identical retry succeeded. Not reproducible.

**BLOCKED:** two-device WebRTC call (only one device attached, no emulator
installed); everything after the SDP offer (blocked by the Call Protection
crash); rebuild/re-verify (no local JDK, CI is the only build path).

**Fixes applied but NOT yet built or verified on device:**

- `mobile/app/call/protection.tsx` — overlay moved out of `<RTCView>`.
- `mobile/android/.../callaudio/CallAudioModule.kt` — added
  `resolveWith`/`toWritableMap` marshalling for every promise and event.

Nothing in this section may be presented as working functionality until an APK
containing both fixes has been re-tested on the device.

### FINAL VALIDATION (open before submission)

- [ ] **Two-physical-device validation remains outstanding (NOT VERIFIED).** An API-level
      simulation is not a substitute. No second device or emulator was available
      on 2026-10-06.
- [ ] Test the *deployed* backend from a phone on mobile data: circle, current,
      verify and — with the production `FEATHERLESS_API_KEY` — analyze and challenge.
      (The audit sandbox could not reach Vercel or Featherless: `host_not_allowed`.
      2026-10-06: circle/current/verify/analyze/challenge all passed **from the phone
      on Wi-Fi**; mobile data still untested.)
- [ ] Final APK install and full flow on device; keep evidence (build link, screenshots).
      2026-10-06: core flows pass (see ON-DEVICE TEST RESULTS); Call Protection and
      Call Audio Feasibility crash and must be retested after the fixes are built.
- [ ] Rebuild with the two crash fixes, reinstall over ADB, retest Call Protection
      and Call Audio Feasibility.
- [ ] Owner decision on the Pressure check result wording (finding F1).
- [ ] Rehearse `DEMO_SCRIPT.md` end to end, including one deliberate network failure.
- [ ] README final pass (finding F4).
- [ ] Record the 2–4 min video; submit on Devpost by Fri Oct 9 (hard deadline
      Sat Oct 10, 12:00 PM EDT).

### Audit findings (documented, deliberately not fixed)

- **F1 — Pressure check labels over-claim.** `mobile/app/analyze.tsx` renders
  *Likely human*, *Likely clone / scam pressure* and *Human likelihood n/100*, while
  the model only sees a text transcript and the screen itself says it does not
  detect cloned voices. A calm, well-written scam script can come back as *Likely
  human* — false reassurance. Not a functional blocker, so not changed. Smallest
  possible fix (label-only, no schema/API change): show the pressure score and
  reasoning, drop the *Likely human* label and the *Human likelihood* line, and
  rename *Likely clone* to *High pressure*. **Owner decision.** Until then, follow
  the wording rules in `DEMO_SCRIPT.md`.
- **F2 — Personal question is not personalized on mobile.** The screen has no input
  for private context, so `/api/challenge` receives an empty context and returns a
  generic question. Do not present it as using saved personal details.
- **F3 — AI-route rate limits were bypassable (FIXED 2026-10-07).** `/api/analyze` and
  `/api/challenge` previously keyed rate limiting solely on caller-supplied `pairId`.
  Fixed in nightly build: AI routes now enforce dual-bucket rate limiting (10 req/min
  per client IP address and per pair ID) to prevent credit exhaustion via randomized `pairId`s.
- **F4 — Root README is stale.** It still describes a "mobile-first web app", has a
  browser-only architecture diagram, and says pair data lives in server-side local
  storage, while the implementation is stateless (HMAC-derived secrets; see
  `ARCHITECTURE.md`/`SECURITY.md` T3). `mobile/README.md` listed a "Demo Mode" that
  does not exist; that line was removed in this audit.
- **F5 — Expo Doctor incomplete.** 14/17 checks pass; the 3 others need
  `api.expo.dev`, blocked in the audit sandbox (NOT VERIFIED, not a project
  failure). Re-run on the dev machine: `cd mobile && npx expo-doctor && npx expo install --check`.
- **F6 — Web build not reproduced here.** The production build failed only because
  the sandbox cannot fetch Google Fonts. Type checking passes once Next has generated
  its types; a plain `tsc` on a fresh clone reports `LayoutProps` as missing until
  the first dev/build run (expected, not a bug).
- **F7 — Cosmetic.** `prettier --check` flags 7 files that were already unformatted
  before this audit (AGENTS.md, DEMO_SCRIPT.md, HACKATHON.md, README.md, ROADMAP.md,
  `lib/featherless.ts`, `mobile/app.json`); 2 unused-variable ESLint warnings in
  `components/CreatePair.tsx`. Left alone on purpose (no mass reformatting during freeze).
- **F8 — `eas.json` `production` profile has no `EXPO_PUBLIC_API_BASE_URL`.** A
  production AAB would report "server address not configured". Irrelevant to the
  `preview` APK used for the demo; post-hackathon.

### POST-HACKATHON (do not start now)

- Durable/distributed rate limiting (**KNOWN LIMITATION**, confirmed still in-memory
  per serverless instance) and server-side limiter keys that do not depend on
  caller-chosen values (F3).
- Call-aware automation, deeper telephony integration, background execution
  (see the product roadmap below).
- Accounts, device enrollment/revocation, persistent storage.
- `production` EAS profile env (F8), Expo Doctor re-run (F5), formatting cleanup (F7).

## Product and demo principles

- **Working demo first.** The submission must demonstrate a genuinely working
  core flow, not a fake interaction or click-through that only looks functional.
- **Honest presentation.** Screenshots, prerecorded video, and other presentation
  aids are allowed as fallbacks, but must not be presented as live functionality.
- **Evidence over scripted outcomes.** Do not claim a detector result, AI result,
  or other external behavior unless it was actually observed.
- **Personal-first UX.** The long-term Personal product should feel automated:
  the user starts a protection/check flow and Handshake orchestrates the relevant
  checks instead of asking the user to choose technical tools.
- **Call-aware automation is the long-term target.** During a supported call
  session, Handshake should act as a protection companion: identify the trusted
  person, prepare the relevant verification context, run appropriate checks when
  the required signals are available, and surface one understandable result.
  The user should not have to manually open Pressure Check, Personal Challenge,
  or other internal controls one by one.
- **Platform boundaries are explicit.** Call state, audio, transcription and
  background execution can only be used where the operating system and user
  permissions actually allow them. A future call mode must never depend on a
  fabricated "always listening" capability.
- **Hackathon platform decision.** Personal mobile is now the primary hackathon
  deliverable. The existing Next.js web app remains in the repo as the working
  prototype and API/reference client. Do not broadly rewrite it during the mobile
  sprint. Business web is the post-hackathon product.

## Day plan

### J1 — Sat Oct 3: idea, repo, docs ✅

- [x] Idea + scenario validated ("mom, send money" voice-clone scam)
- [x] Vibe-coding instructions repo fetched and applied (see AGENTS-level rules)
- [x] Event facts verified: deadline 12:00 PM EDT, judging criteria, track prompt
- [x] Repo initialized: Next.js 16 + TS + Tailwind, otplib, zod, ESLint, Prettier
- [x] Docs: README, ROADMAP, ARCHITECTURE, SECURITY, DEMO_SCRIPT
- [x] **You:** register on Devpost (forgehacks-2026.devpost.com) + join Discord
- [x] **You:** redeem $25 Featherless credits (Discord) → API key → `.env.local`

### J2 — Sun Oct 4: rotating codes end to end ✅

- [x] Pair creation (server derives + holds the pair secret)
- [x] "My codes" screen (caller side): current code + countdown
- [x] Verify screen (receiver side): huge code + countdown + claimed-code entry
- [x] Server verify: verdict `verified` / `not-verified` / `waiting`
- [x] Manual test: two devices, same code, wrong code rejected, rotation works
- **Definition of done:** the code flow works live on two devices, no manual state.

### J3 — Mon Oct 5: hardening + public URL ✅

- [x] Rate limiting on code verify (attempts per window per pair)
- [x] Rotation-boundary handling (current ± previous window)
- [x] Error states: malformed input, rate limited, not configured — plain language
- [ ] Vercel deploy, public URL tested from a mobile network
- **Definition of done:** a stranger with the URL cannot break or spam the demo.

### J4 — Tue Oct 6: AI features ✅

- [x] Pressure check: transcript in → risk level + tactics out (zod-validated JSON)
- [x] Personal challenge: saved context → one question (zod-validated JSON)
- [x] Prompt-injection fence: transcript is data, model has no tools, output capped
- [x] Failure path: invalid model output → one retry → safe error state
- [x] Manual test: scammy transcript flagged, benign transcript low-risk, injected instruction ignored
- **Definition of done:** both features survive a hostile transcript without leaking internals.

### J5 — Wed Oct 7: Personal-first redesign + demo ✅

- [x] Home page centered on one primary verification action
- [x] Trusted people flow uses human language
- [x] Verification flow uses clear instructions and a large code field
- [x] Caller code is large and readable with a rotation countdown
- [x] Internal risk checks are orchestrated by the shield engine
- [x] Simplified status language to **Protected / Verify / Risk**
- [x] Removed WebRTC-only Call Protection from the mobile product
- [x] Kept optional Android overlay for warnings above phone/calling apps
- [x] Clone of the developer's own voice generated with consent
- [ ] Run the existing voice clone through a commercial detector and record the observed result
- [ ] Build the contrast only from observed detector evidence
- [ ] Record the final 2–4 minute demo video

### J6 — Thu Oct 8: Protection companion + QA

- [x] Keep ordinary operator calls as the primary phone-call surface
- [x] Do not replace the system phone UI with a Handshake-only call
- [x] Remove the Handshake-to-Handshake WebRTC call product
- [x] Add clear overlay-permission onboarding
- [x] Keep manual **Check a call** for phone calls, WhatsApp and other third-party calling apps
- [x] Keep Pressure Check and Personal Challenge behind one shield experience
- [ ] Finalize overlay behavior on the Samsung A17
- [ ] Verify carrier call-state awareness on the release APK
- [ ] Verify warning overlay appears above the phone app
- [ ] Verify the manual check flow while another calling app is open
- [ ] Final UI polish: spacing, contrast, hierarchy, error and loading states

**Important boundary:** Handshake does not automatically receive private two-way audio from
ordinary operator calls or third-party apps such as WhatsApp. Do not claim live audio
analysis for those surfaces unless independently verified.

### J7 — Fri Oct 9: final QA + demo + submit

- [ ] Full manual test pass on the mobile app
- [ ] Build and install the final Android APK
- [ ] Verify startup, trusted people, rotating code, correct/wrong verification
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
The mobile product keeps the shared-code verification model, the shield orchestration,
and the optional Android warning overlay.

## Post-hackathon product direction

1. Continue Handshake Personal as the Android-first trust companion.
2. Keep the web product as the basis for Handshake Business after the hackathon.
3. Keep one shared Handshake Core/API for verification and risk policy.
4. Move internal checks behind an orchestration layer instead of exposing a toolbox.
5. Add accounts, device enrollment/revocation, persistent storage and distributed
   abuse controls before consumer security claims.

## Post-hackathon roadmap — communication companion

### Phase 1 — Stable protection layer
- Finish Samsung A17 release validation.
- Make overlay permission setup explicit and reversible.
- Keep carrier call-state awareness separate from audio analysis.
- Make the manual interaction check easy to use beside WhatsApp and other calling apps.

**Exit:** the user can reliably protect a phone interaction without replacing the
calling application.

### Phase 2 — Evidence-driven risk orchestration
- Combine pressure signals, trusted-person context and user input.
- Select the smallest useful check automatically.
- Keep the user-facing states to **Protected / Verify / Risk**.
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
- Device enrollment and revocation
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
**Protected**
→ **Verify**
→ **Risk**

The user should not need to know whether Handshake used Pressure Check, Personal
Challenge or another internal capability. The product chooses the check and presents
the next useful action.

## Legacy technical research

The Android audio-feasibility research remains archived in `docs/CALL_AUDIO_FEASIBILITY.md`. It established that ordinary carrier-call remote audio is not available to the tested third-party app path. It is retained as evidence, not as a shipped feature.

The former Handshake-controlled WebRTC call screen and its mobile client have been removed from the current product. Any future supported audio architecture must be independently verified before implementation.
