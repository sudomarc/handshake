# Architecture

Status: J5 — Personal-first redesign complete. All modules implemented.

## Overview

Handshake is a Next.js 16 App Router application. All state and all secrets live
on the server (API routes). The browser is a thin, mobile-first UI that only
ever receives: short rotating codes, validated AI results, and static content.

## Components

| Component          | Location                            | Responsibility                                                                          |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------- |
| Home               | `mobile/app/(tabs)/index.tsx`       | Protection-ready home, person verification, call check and warning setup               |
| Verify screen      | `mobile/app/verify/[pairId].tsx`    | Trusted-person verification with shared rotating code and actionable verdict           |
| My codes screen    | `mobile/app/codes/[pairId].tsx`     | Caller: large rotating code + countdown, to read aloud                                  |
| Trusted people     | `mobile/app/(tabs)/trusted.tsx`     | Create, join and manage trusted relationships                                           |
| Pressure check     | `app/analyze/page.tsx`              | Transcript in → pressure score + risk level + reasoning (advisory)                      |
| Personal challenge | `app/challenge/[pairId]/page.tsx`   | Private context → one personalized question (advisory)                                  |
| Call warnings      | `mobile/lib/callOverlay.ts`         | Optional Android overlay above phone/calling apps                                       |
| Demo mode          | `app/demo/page.tsx`                 | Creates pair, shows both /verify and /codes links side-by-side for desktop demo         |
| Codes module       | `lib/totp.ts`                       | `otplib` wrapper: derive secret, current code, verify with window                       |
| AI module          | `lib/llm.ts` / `lib/featherless.ts` | Server-only `fetch` client for Featherless (OpenAI-compatible `chat/completions`)       |
| Schemas            | `lib/schemas.ts`                    | zod schemas for every API input/output and LLM output                                   |
| Prompts            | `lib/featherless.ts`                | System prompts with untrusted-data fence (`<UNTRUSTED_TRANSCRIPT>`, `<SHARED_CONTEXT>`) |
| Rate limiting      | `lib/rateLimit.ts`                  | Fixed-window in-memory rate limiter (demo-grade)                                        |
| Store              | `lib/store.ts`                      | Demo-grade pair storage (stateless derived secrets)                                     |

## Data flows

### 1. Codes (verify a call)

1. `POST /api/circle` — create a pair. The server derives a TOTP secret for the
   pair (see "Pair secrets") and never returns it.
2. Receiver opens `/verify/[pairId]`; page polls `GET /api/code/current?pairId=`
   every ~5 s. Response: current 6-digit code + `secondsRemaining` (server-
   anchored, so the countdown is correct even with client clock drift).
3. Caller (real person) opens `/codes/[pairId]` on their own device, sees the
   same code, reads it aloud during the call.
4. Receiver types the claimed code → `POST /api/code/verify` `{pairId, code}`.
5. Server checks the code against the secret for the **current and previous**
   30 s window (`otplib` window = 1, to absorb the rotation boundary).
6. Verdict: `verified` (match) / `not-verified` (mismatch) / `waiting` (nothing
   claimed yet). At most 5 attempts per 30 s window per pair, then locked for
   the window (J3).

Why polling instead of WebSockets: the 30 s period is coarse; a 5 s poll is
simpler, stateless, and works identically on serverless hosting.

### 2. Pressure check (untrusted transcript → LLM)

1. `POST /api/analyze` — body validated by zod (string, max 4000 chars).
2. Server builds the prompt: a fixed system prompt that fences the transcript as
   untrusted data inside `<UNTRUSTED_TRANSCRIPT>` delimiters, no tools / no
   function calling.
3. `fetch` to `{FEATHERLESS_BASE_URL}/chat/completions`, output token cap set.
4. Response content is parsed as JSON and validated against the zod schema
   `{ pressureScore: 0-100, humanLikelihood: 0-100, reasoning: string, verdict: "likely_human" | "likely_clone" | "uncertain" }`.
5. Invalid output → one retry → if still invalid, a safe structured error state
   (never raw model text, never an internal stack trace).

### 3. Personal challenge (trusted saved context → LLM)

Same shape as (2): saved private context is in (zod-validated), one question out
(zod-validated). The context is placed in `<SHARED_CONTEXT>` delimiters. Output
schema: `{ challenge: string, category: "personal"|"recent"|"common_knowledge", difficulty: "easy"|"medium"|"hard" }`.
Invalid output → one retry → safe error.

## Trust boundaries

```
Browser (untrusted)                    Server (trusted)                  External
─────────────────────                  ────────────────                  ────────
user input (pairId, claimed            TOTP secrets (derived, in         Featherless API
code, transcript, saved                memory only) · FEATHERLESS_API_KEY· key in env vars,
context) ──zod validation──▶           · PAIR_DERIVATION_KEY             never in browser
                                         · rate limits
                                         · prompt fence
```

- **What runs on the server:** TOTP secret handling, the AI key, storage, rate
  limits, prompt assembly, output validation.
- **Where secrets live:** environment variables only (`FEATHERLESS_API_KEY`,
  `PAIR_DERIVATION_KEY`). Never in the repo, logs, error messages, or client
  bundles. `.env*` is gitignored except `.env.example`.
- **How untrusted transcripts reach the LLM:** the transcript is placed in the
  user turn, wrapped in explicit `<UNTRUSTED_TRANSCRIPT>` delimiters, and the
  system prompt states that any instructions inside it must be ignored and that
  the model must answer only with the fixed JSON schema. The model has no
  tools, so even a successful injection cannot trigger actions — worst case is
  a wrong analysis shown to the user, which is exactly what an advisory tool is.

## Pair secrets and demo storage

**Decision (J2):** the pair secret is _derived_, not stored:
`secret = HMAC-SHA256(PAIR_DERIVATION_KEY, pairId)` (standard Node `crypto`,
no custom crypto). Reasons:

- Serverless hosting (Vercel) has an ephemeral file system — anything written
  can disappear between requests/deploys. A derived secret makes the code flow
  **stateless**: the server can recompute it from `pairId` on any instance.
- Nothing secret is persisted at rest.
- `otplib` accepts the derived value as a standard TOTP seed.

Trade-off (documented, accepted for demo): anyone who knows both `pairId` and
the server key can compute the secret; in the demo, `pairId` is the shared
membership secret exchanged in person. `lib/store.ts` additionally keeps a
local JSON circle list where the file system allows (dev); on Vercel the circle
list may be empty — the demo creates the pair on the fly (takes seconds).

**Fallback if derivation misbehaves:** move pair storage to Supabase (only if
time remains, per plan).

**Production version would need:** a real database; real accounts with login +
device registration (2FA); secrets encrypted at rest with key management;
per-user rate limiting and abuse monitoring; audit logging; a review of the LLM
provider's data-retention and no-training policies (see SECURITY.md).

## Mobile hackathon boundary

The mobile client should consume the existing API instead of duplicating server
security logic. During the hackathon:

- create the mobile app in an isolated `mobile/` project;
- keep the root Next.js app intact unless a minimal API/compatibility/correctness
  fix is required;
- keep secrets, TOTP derivation, validation and rate limiting server-side;
- use the existing `lib/schemas.ts` contracts as the starting point;
- treat the current web application as a reference implementation for the
  mobile client.

The Personal mobile UX should be simpler than the current web prototype and
should not expose the existing AI/security routes as a technical toolbox.

## Future call-aware orchestration (design only)

This section describes the intended post-hackathon behavior. It is **not
implemented by the current web prototype**.

### Session model

```
Call / supported communication starts
                │
                ▼
      Handshake session context
   trusted person + device + consent
                │
                ▼
       Orchestration / policy
        ┌───────┼────────┐
        ▼       ▼        ▼
     rotating  optional  pressure
       code    challenge  analysis
        │       │        │
        └───────┼────────┘
                ▼
        one clear outcome
     Protected / Verify / Risk
```

The orchestrator should choose the smallest useful set of checks from the signals
actually available. It should not require the user to open individual technical
tools, and it should not claim access to data that the operating system has not
granted.

### Platform boundary

Call-state awareness, background execution, carrier-call audio and transcription
access vary by platform and call type. Implementation must therefore begin with
a feasibility spike against real OS capabilities and an explicit permission
model. The product must never simulate unrestricted call interception or hidden
recording.

### Privacy boundary

The default product should be user-controlled and privacy-preserving: explicit
consent for sensitive checks, a clear indication when warnings are enabled,
minimal data collection, no hidden recording, and short-lived handling of
transcripts or call-derived data unless the user explicitly chooses persistence.

### API boundary

The mobile client should continue consuming shared server-side trust and
verification capabilities. Call-aware orchestration belongs above the existing
verification primitives; it should not duplicate TOTP or security logic inside
the mobile UI.

## Key decisions (with one-line rationale)

1. **Standard TOTP via `otplib`, no custom crypto** — the brief demands it; TOTP is the boring, proven choice.
2. **Secrets server-side only** — the browser only ever sees derived 6-digit codes.
3. **Polling for the code, server-anchored countdown** — simplest correct design for a 30 s period.
4. **Plain `fetch` for the LLM, no SDK** — Featherless is OpenAI-compatible; fewer deps, same behavior.
5. **zod on every boundary, including LLM output** — the model is treated as an untrusted input source with a contract.
6. **No agent for the first-hour screen** — it is static advice; an agent would add risk with no benefit (per brief).
7. **Flat `app/`, no `src/`** — the project is small; shortest import paths win.
8. **Personal-first UX** — primary action is "Verify a person", not technical features.
9. **Working-demo honesty** — the hackathon core must work for real; presentation
   fallbacks are allowed only when clearly identified as fallbacks.
10. **Hackathon client priority** — Personal mobile is the primary hackathon
    deliverable; the existing web prototype is preserved.
11. **Post-hackathon web product** — Business becomes the dedicated web experience
    after the hackathon, with shared verification/security logic.
12. **Automated Personal UX** — internal checks should be orchestrated by
    Handshake rather than exposed as a toolbox when feasible.
13. **Call-aware orchestration is post-hackathon** — protect the working MVP
    while validating mobile OS capabilities before deep telephony integration.

## Client map

```
Handshake Core / API
       │
       ├── Handshake Personal — React Native + Expo + TypeScript (hackathon)
       │
       └── Handshake Business — Next.js + TypeScript (post-hackathon)

Current root web app:
- preserved as the existing web prototype/API reference;
- not broadly rewritten during the mobile sprint.
```

## Route map (current web prototype, J1–J5)

```
GET  /                     home: Verify a person / My trusted people / Other tools
GET  /circle               add / list trusted people
GET  /codes/[pairId]       caller: huge code + countdown (read aloud)
GET  /verify/[pairId]      receiver: huge code + countdown + claimed-code entry + verdict
GET  /analyze              pressure check form
GET  /challenge/[pairId]   personal challenge form
GET  /first-hour           static checklist (placeholder)
GET  /demo                 demo mode: create pair, open both screens side-by-side
POST /api/circle           create pair
GET  /api/circle/[pairId]  pair meta (never the secret)
GET  /api/code/current     current code + secondsRemaining
POST /api/code/verify      claimed code → verdict (rate-limited)
POST /api/analyze          transcript → pressure check JSON
POST /api/challenge        context → challenge JSON
```

## Mobile communication model

Handshake does not replace the system Phone app and does not create a Handshake-only call.
The Android layer observes carrier call state for the warning overlay. Third-party calling apps
such as WhatsApp are companion surfaces: the user can keep warnings enabled and run the manual
Check a call flow, but Handshake does not automatically receive private two-way audio from them.

The shared rotating code remains the authoritative identity verification mechanism.
Pressure Check is an advisory risk signal only; it must never be represented as a voice-clone or
human-authenticity detector.
