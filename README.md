# Handshake

> **The voice can be cloned. The person can still prove who they are.**

Handshake is a mobile-first web app that helps you verify _who is actually on the
other end_ of a phone call or message — even when the voice sounds exactly like
someone you love. Instead of trying to detect the fake (an arms race that voice
detectors keep losing), Handshake checks something a clone can never have: access
to a secret your trusted circle shares.

Built solo for the **AI + Cybersecurity** track at
[ForgeHacks 2026](https://www.forgehacks.dev/) (Oct 3–10, 2026).

## The problem

> "Mom, it's me — I'm in trouble, I need money right now."

Modern voice cloning needs only seconds of audio — a voicemail, a social-media
post — to sound nearly indistinguishable from the real person. Even trained
listeners and commercial detectors struggle with good clones. And the victim is
usually alone, on the phone, under time pressure.

## Why this approach

Deepfake detection is an arms race: every detector is eventually outpaced by a
better generator. Handshake changes the question. We stop asking
_"is this voice real?"_ and ask _"does the person on this call have access to
something only the real person has?"_

The real person can always prove who they are in seconds — no matter how perfect
the fake is.

## Features (in build priority)

1. **Trusted Circle + rotating codes.** You and a trusted contact create a
   private pair. The pair shares a secret that produces a short code, changing
   every 30 seconds. During a call, the caller is asked to say the current code;
   you compare it with the huge code on your screen, or type what you heard for a
   server-confirmed verdict. A clone can't say a code it has never seen.
2. **Pressure check (AI).** Paste what the caller said (a transcript or message).
   An LLM flags manipulation tactics — artificial urgency, secrecy, immediate
   payment, authority pressure — and returns a risk level plus reasons, as
   validated structured data. Advisory, not a verdict.
3. **Personal challenge (AI).** From a few private details you saved in advance
   (nicknames, shared memories), the app generates a question only the real
   person could answer.
4. **The first hour.** A calm, static checklist for the 60 minutes after money
   has already moved. No AI, no decisions made under stress — just the right
   steps, in order.

## Architecture

```mermaid
flowchart LR
  subgraph browser ["Your phone (browser, mobile-first)"]
    verify["Verify screen<br/>huge code + countdown"]
    codes["My codes screen"]
    analyze["Pressure check"]
    challenge["Personal challenge"]
    firsthour["The first hour"]
  end

  subgraph server ["Next.js server (API routes)"]
    totp["Codes module<br/>(otplib, standard TOTP)"]
    llm["AI module<br/>(server-only client)"]
    store["Demo storage"]
  end

  llm -- "HTTPS, key stays server-side" --> fea["Featherless AI API<br/>(OpenAI-compatible)"]

  verify -- "GET current code · POST claimed code" --> totp
  codes -- "GET current code" --> totp
  analyze -- "POST transcript (treated as untrusted data)" --> llm
  challenge -- "POST saved private context" --> llm
  totp --- store
```

All secrets — pair secrets and the AI key — live on the server only. The browser
never sees them. Full details in [ARCHITECTURE.md](./ARCHITECTURE.md); the threat
model and its honest limits in [SECURITY.md](./SECURITY.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict) + **Tailwind CSS**
- **`otplib`** for the rotating codes (standard TOTP — no custom crypto)
- **`zod`** validates every API input and output, including LLM output
- **Featherless AI** (OpenAI-compatible API) for the two AI features; the key
  exists only in server environment variables
- **Demo-grade local storage** (see Honest limitations) · hosted on **Vercel**

## Quick start

```bash
git clone https://github.com/sudomarc/handshake
cd handshake
npm install
cp .env.example .env.local   # then fill in FEATHERLESS_API_KEY
npm run dev                  # http://localhost:3000
```

## Environment variables

Defined in [`.env.example`](./.env.example). Copy to `.env.local` (never
committed).

| Variable               | Required         | Purpose                                                                     |
| ---------------------- | ---------------- | --------------------------------------------------------------------------- |
| `FEATHERLESS_API_KEY`  | for AI features  | API key, server-side only                                                   |
| `FEATHERLESS_BASE_URL` | no (default set) | `https://api.featherless.ai/v1`                                             |
| `FEATHERLESS_MODEL`    | no (default set) | e.g. `Qwen/Qwen3.8-27B`                                                     |
| `PAIR_DERIVATION_KEY`  | for codes        | server secret used to derive pair secrets (lands with the codes module, J2) |

## The demo

A voice clone of the developer is made, passed to a commercial deepfake detector
(that says "human"), then used in a live scam scenario. The clone **fails**
Handshake: it cannot say the rotating code or answer the personal challenge,
while the real person verifies in seconds. The contrast is the whole story.

Full step-by-step script, roles, preflight checks and fallbacks:
[DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Honest limitations

- **Demo-grade storage.** Pair data lives in simple server-side local storage.
  On the hosted demo it may reset (serverless file systems are ephemeral), which
  is why the demo creates a fresh pair right before the show. A production
  version would need a real database, real accounts/auth, and encrypted
  server-side secret storage — see ARCHITECTURE.md.
- **The AI features are advisory.** The pressure check and challenge are LLM
  outputs: helpful signals, not guarantees. We do not claim detection accuracy
  numbers because we have not measured them and would not report unprovable
  ones.
- **Shared-secret trust model.** The codes prove the caller can access a device
  enrolled in the circle. If that device is stolen, the codes go with it — the
  same trust model as any one-time-password system.
- **No accounts in the demo.** Anyone who knows a pair ID can interact with that
  pair; the pair ID is the shared secret, not a username.

## Ethics & consent

- The voice clone used in the demo is of the **developer's own voice**, with
  consent. No real third party is impersonated.
- "Mom" is a role-played scenario for the demo; no real person is targeted, and
  no real scam is attempted.
- Transcripts are analyzed in memory by the LLM provider and are not stored by
  the app. Before any production use, the provider's data-retention and
  no-training policies must be reviewed (not yet done for this demo).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — components, data flows, trust boundaries
- [SECURITY.md](./SECURITY.md) — plain-language threat model, mitigations and gaps
- [ROADMAP.md](./ROADMAP.md) — day-by-day plan and cut list
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — the exact demo flow with fallbacks
