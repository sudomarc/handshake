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

### FINAL VALIDATION (open before submission)

- [ ] **Two-physical-device validation remains outstanding (NOT VERIFIED).** An API-level
      simulation is not a substitute.
- [ ] Test the *deployed* backend from a phone on mobile data: circle, current,
      verify and — with the production `FEATHERLESS_API_KEY` — analyze and challenge.
      (The audit sandbox could not reach Vercel or Featherless: `host_not_allowed`.)
- [ ] Final APK install and full flow on device; keep evidence (build link, screenshots).
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

The long-term Personal experience is not a toolbox of manual security features.
Handshake should become a **user-controlled trust layer around a communication
session**, automatically choosing the smallest useful set of checks.

### Phase 1 — Call-awareness feasibility

- Verify what Android and iOS actually permit for call-state awareness,
  background execution, notifications, audio access and transcription.
- Prototype only OS-supported signals with explicit user consent.
- Identify which call types are realistically supportable first (for example,
  supported VoIP/app calls versus carrier calls).
- Keep the existing verification API as the source of truth.

**Exit condition:** one real supported call/session scenario can be detected or
entered without claiming capabilities the platform does not provide.

### Phase 2 — Protected Call Session

When a protected call starts, Handshake should automatically:

1. load the trusted-person relationship and enrolled device context;
2. start the rotating-code verification context;
3. prepare the relevant risk checks;
4. keep one simple user-facing state: **Protected / Verify / Risk**.

The user can pause or end the protection session at any time.

**Target flow:**

Call starts → Handshake prepares → relevant checks run automatically → one clear result

### Phase 3 — Automatic orchestration

Introduce a server-side orchestration/policy layer that decides which checks
are appropriate from the signals actually available:

- rotating-code verification for trusted-person identity;
- Personal Challenge only when additional proof is useful;
- Pressure Check when a permitted transcript/message source is available;
- recovery guidance when the user reports that money or sensitive information
  may already have been sent.

The UI should present the result and the evidence behind it, not the internal
tool names or technical workflow.

**Target behavior:** the user does not choose the security mechanism; Handshake
chooses the next appropriate verification step.

### Phase 4 — Accounts, devices and persistent trust

- Real accounts and authentication.
- Trusted-person invitations and relationship management.
- Device enrollment, revocation and recovery.
- Real database and production-grade secret storage.
- Replace shared pair IDs as the primary identity primitive.

### Phase 5 — Handshake Business

- Evolve the existing Next.js web prototype into the organization-facing
  Handshake Business dashboard.
- Add organization administration, policies, verification history and reporting.
- Reuse Handshake Core/API instead of duplicating trust logic.

### Phase 6 — Production security, privacy and evaluation

- Production-grade rate limiting, abuse detection and audit logging.
- Explicit consent, privacy controls and data deletion for call-derived data.
- Security review and adversarial testing.
- Measure advisory AI signals before publishing performance claims.
- Review provider data retention and data-processing requirements.

**Long-term product principle:** Handshake should feel automatic during a
supported communication session, while remaining explicit, user-controlled and
privacy-preserving. It must never become invisible surveillance or claim
unverified platform capabilities.

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
