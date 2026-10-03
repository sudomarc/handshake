# Architecture

Status: J1 plan — this describes the intended architecture. Modules listed under
`skeleton` exist as typed stubs and are filled in J2–J4.

## Overview

Handshake is a Next.js 16 App Router application. All state and all secrets live
on the server (API routes). The browser is a thin, mobile-first UI that only
ever receives: short rotating codes, validated AI results, and static content.

## Components

| Component          | Location                       | Responsibility                                                                               |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------- |
| Verify screen      | `app/verify/[pairId]/page.tsx` | Receiver side: huge current code + countdown + claimed-code entry + verdict (skeleton)       |
| My codes screen    | `app/codes/[pairId]/page.tsx`  | Caller side: current code + countdown, to read aloud (skeleton)                              |
| Circle page        | `app/circle/page.tsx`          | Create/list/manage pairs (skeleton)                                                          |
| Pressure check     | `app/analyze/page.tsx`         | Transcript in → risk level + tactics out (skeleton)                                          |
| Personal challenge | `app/challenge/page.tsx`       | Saved context → one question (skeleton)                                                      |
| First hour         | `app/first-hour/page.tsx`      | Static checklist (skeleton)                                                                  |
| Codes module       | `lib/totp.ts`                  | `otplib` wrapper: generate secret, current code, verify with window (skeleton)               |
| AI module          | `lib/llm.ts`                   | Server-only `fetch` client for Featherless (OpenAI-compatible `chat/completions`) (skeleton) |
| Schemas            | `lib/schemas.ts`               | zod schemas for every API input/output and LLM output (skeleton)                             |
| Prompts            | `lib/prompts/`                 | System prompts with the untrusted-data fence (skeleton)                                      |
| Store              | `lib/store.ts`                 | Demo-grade pair storage (skeleton)                                                           |

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
   claimed yet). At most N attempts per window per pair (J3).

Why polling instead of WebSockets: the 30 s period is coarse; a 5 s poll is
simpler, stateless, and works identically on serverless hosting.

### 2. Pressure check (untrusted transcript → LLM)

1. `POST /api/analyze` — body validated by zod (string, max length).
2. Server builds the prompt: a fixed system prompt that fences the transcript as
   untrusted data (see SECURITY.md), no tools / no function calling.
3. `fetch` to `{FEATHERLESS_BASE_URL}/chat/completions`, output token cap set.
4. Response content is parsed as JSON and validated against the zod schema
   `{ riskLevel: low|medium|high, tactics: [...], reasons: [...] }`.
5. Invalid output → one retry → if still invalid, a safe structured error state
   (never raw model text, never an internal stack trace).

### 3. Personal challenge (trusted saved context → LLM)

Same shape as (2): saved private context is in (zod-validated), one question out
(zod-validated). The context is data the user chose to save, so it is treated as
trusted input to the prompt but still length-capped.

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
  user turn, wrapped in explicit delimiters, and the system prompt states that
  any instructions inside it must be ignored and that the model must answer only
  with the fixed JSON schema. The model has no tools, so even a successful
  injection cannot trigger actions — worst case is a wrong analysis shown to the
  user, which is exactly what an advisory tool is.

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

## Key decisions (with one-line rationale)

1. **Standard TOTP via `otplib`, no custom crypto** — the brief demands it; TOTP is the boring, proven choice.
2. **Secrets server-side only** — the browser only ever sees derived 6-digit codes.
3. **Polling for the code, server-anchored countdown** — simplest correct design for a 30 s period.
4. **Plain `fetch` for the LLM, no SDK** — Featherless is OpenAI-compatible; fewer deps, same behavior.
5. **zod on every boundary, including LLM output** — the model is treated as an untrusted input source with a contract.
6. **No agent for the first-hour screen** — it is static advice; an agent would add risk with no benefit (per brief).
7. **Flat `app/`, no `src/`** — the project is small; shortest import paths win.

## Route map (target state, J2–J4)

```
GET  /                     home: Verify a call / My codes / Pressure check
GET  /circle               create + list pairs
GET  /codes/[pairId]       caller: current code
GET  /verify/[pairId]      receiver: huge code + verdict
GET  /analyze              pressure check form
GET  /challenge            personal challenge form
GET  /first-hour           static checklist
POST /api/circle           create pair
GET  /api/circle/[pairId]  pair meta (never the secret)
GET  /api/code/current     current code + secondsRemaining
POST /api/code/verify      claimed code → verdict (rate-limited)
POST /api/analyze          transcript → risk JSON
POST /api/challenge        context → question JSON
```
