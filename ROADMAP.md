# Roadmap — ForgeHacks 2026 (Oct 3 → Oct 10)

**Deadline: Saturday, Oct 10, 2026, 12:00 PM EDT** (Devpost).
**Target submission: Friday, Oct 9, well before noon EDT.**

Devpost note: planned maintenance Oct 7, 6:00 AM UTC / 2:00 AM ET — irrelevant to
us since we submit Oct 9, but do not schedule the final push on Oct 7 morning.

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
- **Platform split (future direction).** Personal is intended as a mobile app;
  Business is intended as a web application. The current hackathon web app remains
  the working prototype and should not be blocked by building the future mobile
  client.

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

### J6 — Thu Oct 8: polish + first-hour + story

- [ ] First-hour screen (static checklist)
- [ ] UX/UI redesign: improve hierarchy, contrast, controls, states, spacing,
      visual identity and human readability — not just a color swap
- [ ] Keep the primary Personal flow obvious: start verification; do not make
      the user choose internal security/AI tools for the core flow
- [ ] README final pass + Devpost project story written
- [ ] Document which parts are live, which are fallbacks, and which are future
      product direction
- **Definition of done:** a first-time user completes the verify flow unaided on a phone.

### J7 — Fri Oct 9: final tests, final video, submit

- [ ] Full manual test pass on the public URL (fresh browser, mobile)
- [ ] Recreate demo pair right before the demo (storage may be ephemeral)
- [ ] Final 2–3 min video
- [ ] **Submit on Devpost before 12:00 PM EDT** (target: by noon)
- [ ] Stop. Buffer day (Oct 10) is untouched.

## Post-hackathon product direction

These are **future product decisions**, not requirements that block the current
hackathon submission:

1. Build Handshake Personal as a React Native + Expo + TypeScript mobile app,
   with Android APK builds for testing/distribution and an eventual Play Store
   AAB/iOS distribution path.
2. Keep Handshake Business as the web experience for organizations.
3. Keep a shared Handshake Core/API so security and verification logic is not
   duplicated across clients.
4. Move from explicit internal tools to automated orchestration in Personal:
   Handshake should select appropriate checks and expose one understandable result.
5. Add real accounts, device enrollment/revocation, persistent storage and
   production-grade abuse controls before any real consumer security claim.

## Cut list (in this order, only if behind)

1. **Personal challenge** (feature 3) — second LLM feature, highest added risk.
2. **Pressure check** (feature 2) — first LLM feature, but the demo still works on codes + contrast without it.
3. **Visual polish** (animations, extra screens) — keep it functional and clean.
4. **First-hour screen** — last to cut: it is a static page and cheap; ship a simplified version if needed.

**Never cut:** trusted circle + rotating codes, the contrast demo, the video, the Devpost submission.

## Definition of done (overall)

- Public URL works from a phone.
- Core verification flow works for real on two devices.
- Any live AI feature shown in the demo actually calls the configured backend.
- Demo video (2–3 min) uploaded and linked on Devpost.
- Repo public with README that a judge can follow to run the app.
- Submission completed ≥ 4 h before the deadline, with buffer for Devpost issues.

**A presentation-only mockup is not sufficient as the definition of done for the
core product.**
