# Architecture

Status: 2026-10-08 — QR physical pairing + device-trust protocol is the primary
flow; the legacy code-verification routes remain for backward compatibility.

## Overview

Handshake is a Next.js 16 App Router application. The trust state, invitations,
device enrollments and call-session attestations live on the server (API
routes). The browser/mobile UI is a thin, mobile-first client that receives:
device trust states, validated AI results, and static content.

## Components

| Component          | Location                            | Responsibility                                                                          |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------- |
| Home               | `mobile/app/(tabs)/index.tsx`       | Protection-ready home, automatic recognition state and warning setup                    |
| Trusted people     | `mobile/app/(tabs)/trusted.tsx`     | QR pairing: show/scan a short-lived invite, confirm, manage trusted relationships       |
| Person detail      | `mobile/app/trusted/[pairId].tsx`   | Enrolled devices, revocation                                                           |
| Pressure check     | `app/analyze/page.tsx`              | Transcript in → pressure score + risk level + reasoning (advisory)                      |
| Call warnings      | `mobile/lib/callOverlay.ts`         | Optional Android overlay above phone/calling apps                                       |
| Demo / pairing     | `app/demo/page.tsx`                 | Flow description of two-phone QR pairing + automatic recognition (no live QR on web)    |
| Codes module       | `lib/totp.ts`                       | `otplib` wrapper for the **legacy** `/api/code/*` compatibility routes                  |
| Trust protocol     | `lib/trustCrypto.ts`                | Device proofs, session attestation, invite/pairing primitives                           |
| Trust store        | `lib/trustStore.ts`                 | In-memory store: devices, invitations, sessions (per server instance)                   |
| AI module          | `lib/llm.ts` / `lib/featherless.ts` | Server-only `fetch` client for Featherless (OpenAI-compatible `chat/completions`)       |
| Schemas            | `lib/schemas.ts`                    | zod schemas for every API input/output and LLM output                                   |
| Trust schemas      | `lib/trustSchemas.ts`               | zod wire contracts for invites, enrollment, revocation and sessions                     |
| Prompts            | `lib/featherless.ts`                | System prompts with untrusted-data fence (`<UNTRUSTED_TRANSCRIPT>`, `<SHARED_CONTEXT>`) |
| Rate limiting      | `lib/rateLimit.ts`                  | Fixed-window in-memory rate limiter (demo-grade)                                        |
| Store              | `lib/store.ts`                      | Legacy demo-grade pair storage (stateless derived secrets)                              |

## Data flows

### 1. Trust + pairing (QR) — recognize a trusted person

The primary identity mechanism is device-to-device trust, established once by
QR pairing and confirmed automatically during calls.

**Pairing (pre-call, both phones together):**

1. `POST /api/trust/invite` — Phone A creates a short-lived, single-use
   invitation: `{ displayName }` → `{ inviteId, expiresAt, url }` where `url` is
   the deep link the peer scans (`handshake://pair?invite=<inviteId>`). The QR
   payload is served by `GET /api/trust/invite/[inviteId]/qr`.
2. Phone B scans the QR, then `POST /api/trust/invite/[inviteId]/accept` with
   its `displayName`, `deviceId` and `deviceSecret`. Accepting enrolls Phone B
   and returns the `pairId` (state `accepted`).
3. Phone A confirms on its own screen: `POST /api/trust/invite/[inviteId]/confirm`
   enrolls Phone A and moves the invite to `confirmed` (terminal). The
   relationship is mutual: both devices are now in the same circle.

Invite lifecycle: `pending → accepted → confirmed`; `pending → expired |
cancelled`; `accepted → expired`. Terminal states are never reused. The
`pairId` (server-issued relation id) is **never shown to users** — it is an
internal identifier carried by the enrollments.

State of an invite: `GET /api/trust/invite/[inviteId]`.

**During a call (device-to-device authentication):**

1. `POST /api/trust/session` — the initiator opens a session for its circle,
   authenticated with a single-use proof (`deviceId`, fresh `nonce`, `issuedAt`,
   HMAC-style proof over the device secret).
2. `GET /api/trust/session/pending` — the peer discovers the open session and
   `POST /api/trust/session/{id}/join` with its own proof.
3. The server reports `trusted` only when both devices joined with valid proofs;
   both devices verify the returned attestation locally from the `pairId`.
4. `GET /api/trust/session/{id}` (poll) — status includes
   `state: "trusted" | "unverified"` and the attestation. `unverified` covers
   every unresolved case (peer offline, not paired, expired, backend
   unreachable) and must never be rendered as a protection claim.
5. The overlay maps evidence to one state: `trusted` → "Trusted connection",
   unresolved → "Verify", real local risk signal → "Risk detected". Never
   "Protected" without evidence.

Why invite-based pairing instead of codes: no 32-character IDs, no code to type
or read aloud, and invitations are short-lived and single-use.

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
Client (untrusted)                     Server (trusted)                  External
─────────────────────                  ────────────────                  ────────
user input (invite id, device          device secrets & proofs (in       Featherless API
id, device secret at enrollment,       memory) · trust store (devices,   · key in env vars,
transcript, saved context)             invites, sessions)                never in client
──zod validation──▶                    · FEATHERLESS_API_KEY
                                          · rate limits
                                          · prompt fence
```

- **What runs on the server:** trust-store state, proof/attestation
  verification, the AI key, rate limits, prompt assembly, output validation.
- **Where secrets live:** environment variables (`FEATHERLESS_API_KEY`,
  `PAIR_DERIVATION_KEY`) plus per-device secrets registered at enrollment and
  held in memory. Never in the repo, logs, error messages, or client bundles;
  `.env*` is gitignored except `.env.example`.
- **How device authentication works:** each authenticated trust request carries
  a single-use proof (`SHA256` over `deviceSecret` as the last field — see
  `lib/trustCrypto.ts`); nonces are single-use, timestamps are bounded (±60 s),
  and sessions expire after 5 minutes. Production direction: asymmetric device
  keys (Ed25519).
- **How untrusted transcripts reach the LLM:** the transcript is placed in the
  user turn, wrapped in explicit `<UNTRUSTED_TRANSCRIPT>` delimiters, and the
  system prompt states that any instructions inside it must be ignored and that
  the model must answer only with the fixed JSON schema. The model has no
  tools, so even a successful injection cannot trigger actions — worst case is
  a wrong analysis shown to the user, which is exactly what an advisory tool is.

## Pairing & trust storage

**Pairing (primary):** invitations are created with `POST /api/trust/invite`,
single-use and short-lived (`expiresAt`). Accepting (`/accept`) enrolls the
peer; confirming (`/confirm`) enrolls the inviter and completes the pair.
Enrollments, invitations and sessions live in `lib/trustStore.ts` (in-memory,
per server instance). The `pairId` is a server-issued relation id that is never
shown to users.

**Legacy pair secrets (compat only):** the retired `/api/code/*` flow derived
TOTP secrets instead of storing them:
`secret = HMAC-SHA256(PAIR_DERIVATION_KEY, pairId)` (standard Node `crypto`,
no custom crypto). Reasons at the time: serverless hosting has an ephemeral
file system, so a derived secret kept the code flow stateless and nothing
secret was persisted at rest. Those routes remain implemented but are no
longer part of the mobile user flow.

Trade-off of the legacy design (documented, accepted): anyone who knows both
`pairId` and the server key could compute a pair secret; in the demo the
`pairId` was treated as the shared membership secret. The pairing model removes
this exposure for the primary flow: the relation id is internal, and enrollment
requires proving possession of a device that accepted (or confirmed) a
short-lived invite.

**Fallback if the trust store's statelessness misbehaves:** move trust state to
a shared durable store (e.g. Postgres/Redis) — required for serverless hosting
with more than one instance (see Blockers in
TRUSTED_CALL_ARCHITECTURE.md).

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
- keep trust-store state, proofs, validation and rate limiting server-side;
- use the existing `lib/trustSchemas.ts` / `lib/schemas.ts` contracts as the
  starting point;
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
   device    optional  pressure
   trust    challenge  analysis
  session     │        │
        └───────┼────────┘
                ▼
        one clear outcome
   Trusted / Verify / Risk
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
trust primitives; it should not duplicate proof/attestation or security logic
inside the mobile UI.

## Key decisions (with one-line rationale)

1. **Device-to-device trust instead of spoken codes** — the primary identity
   check is a paired device proving a session, not a code read aloud.
2. **QR pairing, physically together** — short-lived single-use invitations;
   both phones confirm; no 32-char IDs or codes to type.
3. **Secrets server-side / on-device, never shown** — the relation id is
   internal; device secrets stay in secure storage; the browser never receives
   credentials.
4. **Plain `fetch` for the LLM, no SDK** — Featherless is OpenAI-compatible; fewer deps, same behavior.
5. **zod on every boundary, including LLM output** — the model is treated as an untrusted input source with a contract.
6. **No agent for the first-hour screen** — it is static advice; an agent would add risk with no benefit (per brief).
7. **Flat `app/`, no `src/`** — the project is small; shortest import paths win.
8. **Personal-first UX** — primary action is automatic recognition of trusted
   people, not technical features.
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
14. **Legacy code routes kept, not primary** — `/api/code/*` and `/api/circle`
    remain implemented for backward compatibility only.

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

## Route map (current web + API surface, 2026-10-08)

```
Web pages
GET  /                     home: pairing narrative + three overlay states explained
GET  /circle               companion page: how QR pairing works (mobile app)
GET  /analyze              pressure check form
GET  /first-hour           static checklist (the first hour)
GET  /demo                 pairing demo: flow description (no live QR on web)

Trust / pairing API (primary product surface)
POST /api/trust/invite                          create short-lived single-use QR invite
GET  /api/trust/invite/[inviteId]               invite status
GET  /api/trust/invite/[inviteId]/qr            QR payload
POST /api/trust/invite/[inviteId]/accept        peer accepts → enrolled (state accepted)
POST /api/trust/invite/[inviteId]/confirm       inviter confirms → paired (state confirmed)
POST /api/trust/enroll                          device enrollment (legacy/pre-pairing path)
GET  /api/trust/circle                          enrolled devices in a circle
POST /api/trust/revoke                          revoke a device or whole circle
POST /api/trust/session                         open a call session (initiator)
GET  /api/trust/session/pending                 discover open sessions (peer)
GET  /api/trust/session/[sessionId]             poll session status + attestation
POST /api/trust/session/[sessionId]/join        join a session (peer) → trusted

Legacy compatibility routes (no longer primary; kept for backward compatibility)
POST /api/circle                                create a legacy pair
GET  /api/circle/[pairId]                       pair meta (never the secret)
GET  /api/code/current                          current code + secondsRemaining
POST /api/code/verify                           claimed code → verdict (rate-limited)

Other services
POST /api/analyze                               transcript → pressure check JSON
POST /api/challenge                             context → challenge JSON
```

## Mobile communication model

Handshake does not replace the system Phone app and does not create a Handshake-only call.
The Android layer observes carrier call state for the warning overlay. Third-party calling apps
such as WhatsApp are companion surfaces: the overlay and recognition states stay visible, but
Handshake does not automatically receive private two-way audio from them.

The authoritative identity mechanism is the device-to-device trust protocol: a paired phone is
recognized only when both devices prove enrollment in the same circle and the server confirms
the session, locally verified via attestation. Pressure Check is an advisory risk signal only;
it must never be represented as a voice-clone or human-authenticity detector.
