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
- **F3 — AI-route rate limits are bypassable.** `/api/analyze` and `/api/challenge`
  key their limiter on the caller-supplied `pairId`; pairs are stateless, so any
  32-hex string is accepted. Observed: 40 of 40 requests with random `pairId`s
  passed the limiter; the same `pairId` was limited after 10. Cost-abuse exposure on
  a public URL (Featherless credits). Post-hackathon hardening, unless credits are at
  risk before submission.
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

### J5 — Wed Oct 7: Personal-first redesign + contrast demo (in progress)

- [x] Home page: primary "Verify a person", secondary "My trusted people", tertiary AI tools
- [x] Circle → "My trusted people" with human language (parent, sibling, partner, friend)
- [x] Verify flow: clear instructions, huge code, prominent input, actionable verdicts
- [x] My codes: huge code for caller, minimal distractions, clear countdown
- [x] CodeDisplay: larger code for caller (text-9xl), centered progress bar
- [x] VerifyForm: actionable verdict messages ("Verified"/"Not verified", do not send money guidance)
- [x] CreatePair: human language ("Add a trusted person", "parent, sibling, partner")
- [x] Demo mode page (`/demo`): creates pair, shows both /verify and /codes links side-by-side
- [ ] Clone my own voice (consent; Featherless voice cloning or equivalent)
- [ ] Run the clone through a commercial deepfake detector; record the result
- [ ] Build the contrast: detector says "human" → Handshake says "not you"
- [ ] Record demo video (first pass, 2–3 min) — early, not last
- [ ] Upload fallback video (unlisted)
- **Definition of done:** the contrast is real, observed, and on record.

### J6 — Thu Oct 8: Personal mobile MVP + integration + story

- [ ] Create Handshake Personal mobile app in isolated `mobile/` Expo project
- [ ] Keep the existing Next.js web prototype intact except for necessary API/compatibility fixes
- [ ] Implement real trusted-person + rotating-code verification flows in mobile
- [ ] Implement caller code screen optimized for reading aloud
- [ ] Remove internal-tool choice from the primary Personal flow
- [ ] Establish mobile API base URL configuration
- [ ] Configure an Android APK build for testing/demo
- [ ] Real two-device mobile test against the existing backend
- [ ] First-hour screen only if time remains after the mobile core is stable
- [ ] Mobile UI polish: hierarchy, contrast, controls, states, spacing and human readability
- [ ] README final pass + Devpost project story written
- [ ] Document live features, fallbacks, future Business web direction and mobile limitations
- [ ] Do **not** attempt unrestricted phone-call interception or background recording for the hackathon MVP
- **Definition of done:** Handshake Personal mobile completes the real verify flow on two devices.

**Hackathon boundary:** automatic during-call behavior is a post-hackathon
product phase. The current sprint proves the trust model and mobile client
without destabilizing them through an unverified telephony integration.

### J7 — Fri Oct 9: mobile QA + final demo + submit

- [ ] Full manual test pass on the mobile app
- [ ] Test the Android APK on a real device/emulator
      (2026-10-06: core flows pass on the Samsung A17; Call Protection and Call
      Audio Feasibility crash — see ON-DEVICE TEST RESULTS. Not complete.)
- [ ] Real two-device verification test using the mobile app
- [ ] Keep the web prototype/API healthy after any compatibility fix
- [ ] Record the cleanest real mobile demo
- [ ] Final public demo video, **2–4 min maximum**
- [ ] Video clearly shows the problem and how the mobile Handshake product works
- [ ] Final README/project description includes target users, technical approach,
      real-world impact, and the correct track
- [ ] Confirm GitHub repo is publicly accessible and contains source code + clear README
- [ ] Add mobile build/testing evidence, screenshots and architecture evidence
- [ ] Explicitly label live features, fallbacks, and future Business web product
- [ ] **Submit on Devpost before 12:00 PM EDT** (target: by noon)
- [ ] Stop. Buffer day (Oct 10) is untouched.

## Hackathon platform decision

**Decision recorded 2026-10-04:** Handshake Personal mobile is the primary
ForgeHacks deliverable.

The existing Next.js web app is preserved as the working web prototype and API
reference. It may receive minimal fixes when required by the mobile client, but
there is no broad web rewrite during this mobile sprint.

After the hackathon, the web product becomes the basis for **Handshake Business**
for organizations. The mobile client becomes the Personal product for families
and individuals.

## Post-hackathon product direction

These are **future product decisions**, not requirements that block the current
hackathon submission:

1. Continue Handshake Personal as a React Native + Expo + TypeScript mobile
   product, with Android APK builds for direct testing and AAB/iOS distribution
   paths as appropriate.
2. Evolve the existing Next.js web product into Handshake Business for organizations.
3. Keep a shared Handshake Core/API so security and verification logic is not
   duplicated across clients.
4. Move from explicit internal tools to automated orchestration in Personal:
   Handshake should select appropriate checks and expose one understandable result.
5. Add real accounts, device enrollment/revocation, persistent storage and
   production-grade abuse controls before any real consumer security claim.

## Post-hackathon roadmap — automatic protection during calls

This is the long-term Personal product direction, **not a hackathon claim and not
currently implemented**. The goal is to make Handshake a **user-controlled trust
layer around a supported communication session**, rather than a toolbox of
manual security buttons.

### Product UX — two states, one protection layer

**Status: PARTIALLY VERIFIED — AUDIO PATH REQUIRES DIFFERENT CALL ARCHITECTURE**

- ✅ Verified what Android permits for call-state awareness (CallScreeningService: metadata only)
- ✅ Verified background execution constraints (microphone FGS: must start from foreground)
- ✅ Verified audio access boundaries (CARRIER CALL REMOTE AUDIO: NOT AVAILABLE to third-party apps)
- ✅ Identified supportable call types: Handshake-controlled VoIP/app calls ONLY
- ✅ Kept existing verification API as source of truth

**Key Findings (2026-10-05):**
- Android carrier-call remote audio: NOT AVAILABLE (CAPTURE_AUDIO_OUTPUT is system-only)
- Local microphone capture: VERIFIED (works when no call active)
- Call detection via CallScreeningService: VERIFIED (metadata for non-contacts)
- Two-way carrier-call audio: NOT AVAILABLE IN TESTED PATH
- VoIP feasibility: CONFIRMED — next phase should implement Handshake-controlled session

**Exit condition MET WITH CAVEAT:** A real supported call scenario (Handshake VoIP) can be detected/entered, but carrier calls cannot be analyzed in real-time.

### Call Audio Feasibility Prototype — COMPLETED (2026-10-05)

**Status: VERIFIED (source review) — Native module implemented, typecheck/lint clean**

#### ✅ Implemented
- Native Android module `handshake-call-audio` with Expo config plugin
- `AudioCaptureManager` — AudioRecord wrapper (MIC, VOICE_RECOGNITION, VOICE_COMMUNICATION)
- `VADProcessor` — Energy-based VAD (SILENCE/SPEECH/UNKNOWN states)
- `CallScreeningServiceImpl` — Call metadata detection (number, direction, verification)
- `CallAudioService` — Microphone foreground service (persists in background)
- `CallAudioModule` — React Native bridge with real-time events
- `CallAudioPackage` — React Native package registration
- Test screen: `call-audio-feasibility.tsx` with real-time metrics

#### 📋 Test Matrix Results (Source Verified)

| Scenario | Call Detected | Local Audio | Remote Audio | Both | Background | Result |
|----------|---------------|-------------|--------------|------|------------|--------|
| Incoming carrier | ✅ (CallScreeningService) | ❌ Silenced | ❌ NOT AVAILABLE | ❌ | ❌ | LOCAL_MIC_ONLY |
| Outgoing carrier | ✅ (CallScreeningService) | ❌ Silenced | ❌ NOT AVAILABLE | ❌ | ❌ | LOCAL_MIC_ONLY |
| Speakerphone | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ | ❌ | LOCAL_MIC_ONLY |
| Earpiece | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ | ❌ | LOCAL_MIC_ONLY |
| Bluetooth | ✅ | ❌ Silenced | ❌ NOT AVAILABLE | ❌ | ❌ | LOCAL_MIC_ONLY |
| App foreground | N/A | ✅ | ❌ NOT AVAILABLE | ❌ | ✅ | LOCAL_MIC_ONLY |
| App background | N/A | ✅ (FGS) | ❌ NOT AVAILABLE | ❌ | ✅ | LOCAL_MIC_ONLY |
| Microphone FGS | N/A | ✅ | ❌ NOT AVAILABLE | ❌ | ✅ | LOCAL_MIC_ONLY |

**Major Discovery:** Android carrier-call remote audio is platform-blocked. `CAPTURE_AUDIO_OUTPUT` required for VOICE_UPLINK/DOWNLINK is system-only.

**Architecture Decision:** Pivot to Handshake-controlled VoIP sessions (`ConnectionService` + WebRTC) where both audio sides are natively available.

### Call Protection Implementation Progress (2026-10-05)

**Status: IMPLEMENTED IN SOURCE — CRASHES ON DEVICE (see ON-DEVICE TEST RESULTS, 2026-10-06)**

The items below were **source-reviewed only** when written. The 2026-10-06 device
test found that the active-call screen crashes (`ClassCastException` on
`<RTCView>`) before any remote media can be established, so none of the call-flow
behaviour downstream of local capture is verified yet.

#### ✅ Implemented in source (source review only — not device-verified)
- WebRTC dependency added (`react-native-webrtc@118.0.7`, `@config-plugins/react-native-webrtc@9.0.0`)
- Expo config plugin configured with microphone/camera permissions
- Native Android permissions: CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, BLUETOOTH, WAKE_LOCK
- Backend signaling API: `/api/call/session`, `/api/call/offer`, `/api/call/answer`, `/api/call/ice`, `/api/call/session/:id`, `/api/call/end`
- Call session store with in-memory session management (30-min TTL)
- WebRTC call manager with peer connection, ICE candidate handling, connection state monitoring
- Call Protection UI screen (`/call/protection`) with:
  - Create protected call / Join call via session ID
  - Real-time call state display (connecting/connected/ended)
  - Local and remote audio stream visualization
  - Mute/unmute, end call controls
  - Protection status badges (Identity ✓, Call Active, Risk Low)
- Device ID generation and secure storage via expo-crypto + expo-secure-store
- TypeScript compilation clean, ESLint clean

> **Device reality (2026-10-06):** session creation, local mic capture,
> `addTrack`, offer creation and ICE gathering were observed. The active-call
> screen then crashed, so state display, local/remote stream visualization,
> mute/unmute and end call were **never rendered**. Treat the bullet list above
> as code that exists, not behaviour that works.

#### 🔄 Blocked / Next Steps
- **Rebuild the APK with the `<RTCView>` fix and retest Call Protection** (highest priority)
- Rebuild and retest Call Audio Feasibility with the `CallAudioModule` bridge fix
- Two-device WebRTC call test (Device A = Samsung A17, Device B = emulator/second
  device) — no second device or emulator available on 2026-10-06
- Verify local audio track transmission (captured on device; not yet observed as
  rendered/streamed)
- Verify remote audio track reception
- Verify two-way audio communication
- Test background/foreground behavior during active call
- Test call establishment reliability (ICE, NAT traversal)

#### 📋 Planned
- VAD integration (reuse existing VADProcessor from native module)
- Real-time audio frame access for analysis pipeline
- STT integration (on-device Whisper.cpp or cloud)
- Pressure Check integration as internal capability
- Risk engine with Protected/Verify/Risk states
- Automatic orchestration based on available signals

**Current Architecture:**
```
Handshake Personal (Expo)
    ↓
WebRTC (react-native-webrtc)
    ↓
Signaling via REST API (existing backend)
    ↓
PeerConnection (audio-only)
    ↓
Local + Remote MediaStream tracks
    ↓
Analysis-ready audio (pending VAD integration)
```

**Target for next validation:** Real two-device WebRTC call with two-way audio confirmed on Samsung A17.
**Gate (2026-10-06):** blocked behind the `<RTCView>` crash fix — the call never
gets past local ICE gathering today.

**When there is no call**, Handshake should behave like a calm Personal trust
center:

- current protection status;
- trusted people / enrolled relationships;
- recent verification activity;
- settings, permissions and privacy controls.

Pressure Check, Personal Challenge and other mechanisms should exist as
capabilities, but they should not dominate the home screen as unrelated manual
tools.

**When a protected call starts**, the product should move into **Call Protection
Mode** while preserving the native communication experience as much as the
platform allows.

The intended experience is:

- the normal Android call UI remains recognizable;
- Handshake adds a small, natural trust layer rather than recreating the whole
  phone application;
- the user sees one understandable security state instead of a technical
  workflow.

Primary states:

- **PROTECTED** — identity context is valid and no elevated signal is currently
  present;
- **VERIFYING / VERIFY** — additional proof is required;
- **RISK / POSSIBLE RISK** — Handshake has a meaningful warning signal and offers
  the next useful action.

Example interaction model:

```text
No call
  ↓
Personal trust center

Call starts
  ↓
Call Protection Mode
  ↓
Protected / Verify / Risk
  ↓
Handshake chooses the next useful check
```

The user should not have to manually open **Pressure Check**, **Personal
Challenge**, and other internal tools one by one. Those become internal
capabilities behind one protection experience.

### Real-time call analysis — intended pipeline

For a call type where the operating system actually exposes an analyzable audio
stream, the target architecture is continuous, low-latency analysis:

```text
Call audio
  ↓
Audio capture
  ↓
Voice Activity Detection (VAD)
  ↓
Short audio frames + rolling buffer
  ↓
Speech-to-text
  ↓
Transcript chunks
  ↓
Risk / manipulation analysis
  ↓
Risk engine
  ↓
PROTECTED / VERIFY / RISK
  ↓
Contextual action (verify / challenge / guidance)
```

The system should **not** send the raw audio stream continuously to the LLM.
A more realistic design is:

- capture and pre-process audio locally where possible;
- detect speech and maintain a short rolling buffer;
- generate transcript chunks;
- send compact text/context to a semantic model only when useful;
- maintain an incremental risk state rather than waiting for the entire call.

The model already used for Pressure Check can become one component of this
risk engine. Its job is to identify signals such as:

- urgency;
- secrecy;
- financial requests;
- authority impersonation;
- threats or consequences;
- coercive framing;
- unusual pressure patterns.

The model output must remain **advisory**, not proof of fraud or proof that a
voice is cloned.

**Latency target (design goal, not measured):** roughly **1–2 seconds** from a
meaningful transcript segment to a visible risk update when the supported
platform and model path can achieve it. This is a target for experimentation,
not a performance claim.

### How the checks should be orchestrated

The protection session should be policy-driven rather than tool-driven:

```text
Available signals
      ↓
Orchestration / policy layer
      ↓
Choose the smallest useful check
      ↓
Combine evidence
      ↓
One user-facing result
```

Examples:

- trusted-person identity signal → rotating-code verification;
- identity uncertainty → Personal Challenge;
- permitted transcript/message signal → Pressure Check;
- user reports money or sensitive data already sent → recovery guidance.

Handshake should choose the next useful action instead of exposing internal
tool names as the primary interaction.

### Android integration strategy

Android integration must be built in layers and validated experimentally.

#### Layer A — Call awareness / caller identity

Android's CallScreeningService is an integration point for call screening and
caller-ID use cases. It can be implemented by the default dialer or a third-party
app. It receives new incoming/outgoing call events for screening/identification,
and incoming-call screening has a strict response window. It is **not** equivalent
to receiving the full two-way call audio.

Official reference:
https://developer.android.com/reference/android/telecom/CallScreeningService

#### Layer B — Native in-call experience

Android's InCallService is the deeper integration path when an application
provides the call UI. This is a separate architectural commitment and should
not be assumed to be necessary for the first prototype.

Official reference:
https://developer.android.com/reference/android/telecom/InCallService

#### Layer C — Microphone / foreground execution

Android supports microphone foreground services for continuing microphone
capture in the background, subject to RECORD_AUDIO, foreground-service type
permissions and Android's background-start restrictions. This provides a way to
capture microphone input under supported conditions, but **does not by itself
grant Handshake unrestricted access to both sides of a carrier call**.

Official references:
https://developer.android.com/develop/background-work/services/fgs/service-types
https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start

#### Layer D — Controlled VoIP / communication session

A longer-term path is for Handshake to own or integrate a supported VoIP
communication session where the application legitimately controls the audio
streams. Android's Telecom stack includes ConnectionService for integrating
managed calls.

Official reference:
https://developer.android.com/reference/android/telecom/ConnectionService

**Current architecture rule:** do not assume that RECORD_AUDIO means 'read the
phone call'. A real experiment must determine what audio is actually available
on the target device and call type.

### First technical prototype after the hackathon

The first implementation task is **not** the full real-time risk engine.

It is a small Android-native feasibility prototype that answers one question:

> During a real call on the target Samsung A17, what audio stream can Handshake
> actually obtain, under explicit user permission, and for which call types?

The test matrix should cover, where possible:

1. incoming carrier call;
2. outgoing carrier call;
3. microphone input;
4. remote/caller audio availability;
5. speakerphone;
6. earpiece;
7. Bluetooth;
8. app foreground;
9. app background;
10. foreground microphone service;
11. the exact stream exposed to AudioRecord or the chosen native audio API.

**Exit condition:** documented, observed evidence showing which scenarios expose
usable audio and which do not.

Do not build the rest of the real-time pipeline until this gate is passed.

### If two-way carrier-call audio is unavailable

The fallback architecture is **not** to fake capture or secretly record.

Instead, evaluate supported communication-session options first, especially a
Handshake-controlled VoIP/session model where both audio sides are legitimately
available to the application.

The product should clearly state which call types are supported.

A carrier-call capability and a VoIP capability are different product surfaces;
they must not be presented as interchangeable.

### Real-time privacy and consent model

Call analysis is a sensitive capability and must remain explicit and
user-controlled.

Design requirements:

- explicit microphone/call-analysis consent;
- clear Android privacy indicators when platform APIs trigger them;
- visible 'Handshake protection active' state;
- user-controlled pause/stop;
- no invisible always-listening behavior;
- minimize raw audio retention;
- prefer on-device processing where practical;
- only send the minimum derived text/context required for semantic analysis;
- define retention/deletion rules before production.

The product must never become covert call surveillance.

### Call Protection UI target

The call interface should feel like **Android + Handshake**, not a second phone
application.

Normal state:

```text
            Trusted contact
                04:37

        ✓ HANDSHAKE PROTECTED

        Identity      ✓
        Risk          Low
        Protection    Active
```

Elevated-risk state:

```text
        ⚠ HANDSHAKE

        Elevated pressure detected

        The caller is creating urgency
        around a payment.

        [ VERIFY ]

        [ CHALLENGE ]
```

The exact visual implementation remains open until the Android integration
constraints are validated. The UX principle is stable: **minimal interruption,
one clear state, one contextual next action**.

### What this phase must not claim

Until the technical feasibility gate is passed and tested on-device, Handshake
must **not** claim that it:

- automatically intercepts every phone call;
- continuously receives both sides of every carrier call;
- analyzes phone-call audio in real time on Android;
- detects cloned voices from live audio;
- runs invisibly in the background;
- works identically on Android and iOS.

Those are hypotheses / future capabilities until independently verified.

### Long-term sequencing

**Phase 1 — Call-awareness feasibility**
- verify Android/iOS call state, audio, background and notification capabilities;
- determine first supported call type;
- build the native audio feasibility prototype;
- record observed constraints.

**Exit:** one genuinely supported communication scenario is technically proven.

**Phase 2 — Protected Call Session**
- connect the proven call/session signal to trusted-person context;
- start the rotating-code verification context automatically;
- expose a single **Protected / Verify / Risk** state;
- let the user pause/end protection.

**Exit:** one supported session can be protected end to end.

**Phase 3 — Real-time analysis**
- audio frames → VAD → rolling buffer;
- speech-to-text;
- incremental semantic risk analysis;
- local risk aggregation;
- contextual intervention;
- latency and battery profiling.

**Exit:** the system reacts to meaningful call content in near real time on a
supported device/session, with measured behavior.

**Phase 4 — Automatic orchestration**
- policy layer selects verification, challenge, pressure analysis or recovery
  guidance;
- surface evidence behind the decision without exposing internal tool mechanics.

**Exit:** users experience one protection layer rather than separate tools.

**Phase 5 — Production trust and privacy**
- accounts;
- device enrollment/revocation;
- persistent storage;
- durable abuse controls;
- consent, retention and deletion controls;
- security review and adversarial testing.

**Phase 6 — Handshake Business**
- evolve the existing Next.js web product into organization-facing controls,
  administration, verification history, policies and reporting;
- reuse the shared Handshake Core/API.

**Long-term principle:** Handshake should feel automatic during a supported
communication session while remaining explicit, user-controlled,
privacy-preserving and honest about platform limits.

## Cut list (in this order, only if behind)

1. **Personal challenge** (feature 3) — second LLM feature, highest added risk.
2. **Pressure check** (feature 2) — first LLM feature, but the demo still works on codes + contrast without it.
3. **Visual polish** (animations, extra screens) — keep it functional and clean.
4. **First-hour screen** — last to cut: it is a static page and cheap; ship a simplified version if needed.

**Never cut:** trusted circle + rotating codes, the contrast demo, the video, the Devpost submission.

## Definition of done (overall)

- Handshake Personal mobile build is testable on a real Android device.
- Core mobile verification flow works for real on two devices.
- Existing web prototype/API still passes its regression checks.
- Any live AI feature shown in the demo actually calls the configured backend.
- Public demo video (2–4 min max) uploaded and linked on Devpost.
- Repo public with README that a judge can follow to run the app.
- Submission completed ≥ 4 h before the deadline, with buffer for Devpost issues.

**A presentation-only mockup is not sufficient as the definition of done for the
core product.**

The video itself is a presentation artifact, but it must demonstrate the
working product honestly rather than manufacture the appearance of functionality.
