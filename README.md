# Handshake

> **The voice can be cloned. The person can still prove who they are.**

Handshake helps you verify _who is actually on the other end_ of a phone call or
message — even when the voice sounds exactly like someone you love. Instead of
trying to detect the fake (an arms race that voice detectors keep losing),
Handshake checks something a clone can never have: a phone that you paired and
confirmed, in person, before the call.

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
_"is this voice real?"_ and ask _"is this call coming from a phone I paired and
confirmed with a real person I trust?"_

The real person&rsquo;s paired phone is recognized automatically — no matter how
perfect the fake is.

## Features (in build priority)

1. **Automatic trusted-call recognition (QR pairing).** Add a trusted person by
   putting two phones together: tap **"Show my QR"** on one and **"Scan a QR"**
   on the other. The invitation is short-lived and single-use; both people
   confirm on their own phones, and the relationship is mutual. No code to type
   or read out loud. During a call, Handshake recognizes a previously paired
   device and shows one of three honest states: **Trusted connection** (both
   phones confirmed and the backend verified the session), **Verify** (peer
   offline / not paired / backend unreachable), or **Risk detected** (a real
   local risk signal). It never shows "Protected" without evidence.
2. **Pressure check (AI).** Paste what the caller said (a transcript or message).
   An LLM flags manipulation tactics — artificial urgency, secrecy, immediate
   payment, authority pressure — and returns a risk level plus reasons, as
   validated structured data. Advisory, not a verdict.
3. **Personal question (AI).** After a meaningful pressure signal, Handshake can generate a private verification question for the trusted person. An internal capability; users don't have to choose it as a separate tool.
4. **The first hour.** A calm, static checklist for the 60 minutes after money
   has already moved. No AI, no decisions made under stress — just the right
   steps, in order.

## Pairing model

Pairing is physical, mutual, and happens once:

1. **Create an invitation** — Phone A: "Add a trusted person" → "Show my QR".
   Handshake creates a short-lived, single-use QR invitation (see
   `POST /api/trust/invite` in ARCHITECTURE.md).
2. **Scan and accept** — Phone B: "Scan a QR". Accepting enrolls Phone B into
   the new circle immediately.
3. **Both confirm** — Phone A confirms on its own screen, which completes the
   pairing (`confirmed`) and enrolls Phone A too.
4. **Recognized during calls** — from then on, the two phones authenticate each
   other through a server-confirmed, locally-verified call session.

The server-issued relation id is an **internal** identifier: it is never shown
to users and never needs to be typed or read. The QR invitation is the only
thing that leaves the phone, and it dies after first use or on expiry.

## Architecture

Handshake Personal (Android)
    ↓
Protection-ready home
    ├── Trusted people (QR pairing: invite → accept → confirm)
    ├── Automatic device recognition during calls
    └── Honest overlay: Trusted / Verify / Risk detected
          ↓
    Trust backend
    ├── QR invitations (`/api/trust/invite*`)
    ├── Device enrollment (`/api/trust/enroll`)
    ├── Call sessions + attestation (`/api/trust/session*`)
    └── Revocation (`/api/trust/revoke`)

Android companion layer
    ├── Operator call-state awareness
    └── Optional warning overlay above phone and calling apps

Next.js backend
    ├── Trust protocol (device proof + session attestation)
    ├── Pressure analysis (`/api/analyze`)
    └── Legacy code-verification routes (`/api/code/*`,
        `/api/circle`) kept for backward compatibility

The mobile client does not replace the system Phone app and does not create a Handshake-only
call. For WhatsApp and other third-party calling apps, Handshake is a companion layer:
the overlay stays visible with overlay permission, and call recognition only ever reports
what the trust backend actually confirmed. Handshake does not claim automatic access to
private two-way audio from those apps.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict) + **Tailwind CSS**
- **Trust protocol** (`lib/trustCrypto.ts`, `lib/trustStore.ts`,
  `lib/trustSchemas.ts`) — device enrollment, single-use proofs, call-session
  attestation. Production direction is asymmetric device keys (Ed25519)
- **`otplib`** for the legacy rotating-code routes (`/api/code/*`), kept for
  backward compatibility — no longer the primary identity mechanism
- **`zod`** validates every API input and output, including LLM output
- **Featherless AI** (OpenAI-compatible API) for the two AI features; the key
  exists only in server environment variables
- **Stateless HMAC derivation** for the legacy TOTP pair secrets (see
  ARCHITECTURE.md) · hosted on **Vercel**

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
| `PAIR_DERIVATION_KEY`  | for legacy codes | server secret used to derive pair secrets (legacy `/api/code/*` compat routes) |

## The demo

Handshake is being built as a **working hackathon prototype**, not a simulated
click-through. The pairing and recognition flow is expected to work for real:

1. pair two phones by QR (one shows, one scans);
2. both people confirm on their own phones;
3. a call from the paired device is recognized automatically and shows
   **Trusted connection**;
4. an unpaired or offline peer shows **Verify** — never a false "Protected";
5. a real local risk signal shows **Risk detected**.

The AI features should also call the configured Featherless endpoint when they are
presented as working features. A screenshot, prerecorded clip, or visual mockup
may be used as a **fallback or presentation aid**, but it must never be described
as a live feature when it is not actually connected and working.

The voice-clone contrast is also evidence-driven: only claim a detector result
that was actually observed and recorded. If the detector does not produce the
expected result, change the demo story rather than scripting a fictional result.

Full step-by-step script, roles, preflight checks and fallbacks:
[DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Product direction

Handshake is currently a working Next.js web prototype plus a **Handshake
Personal** mobile client. The hackathon deliverable is the Personal mobile
product for families and individuals; the existing web app is preserved as the
working web prototype/API client and reference implementation.

The intended product split is:

- **Handshake Personal** — mobile protection for individuals and trusted circles.
- **Handshake Business** — the post-hackathon web product for organizations.
- **Handshake Core** — shared server-side trust and verification capabilities.

### Personal UX direction

The Personal experience is **automation rather than a toolbox**.

When there is no active interaction, Handshake should be a calm trust center showing
protection readiness and trusted people.

When the user is dealing with a phone call or a third-party calling app such as
WhatsApp, Handshake should act as a small companion layer: optional warnings can
stay visible above other apps, and recognition states appear automatically based
on what the trust backend actually confirmed.

The user-facing states are **Trusted connection**, **Verify** and **Risk
detected** — never "Protected" without evidence. Pressure Check and Personal
Question remain internal capabilities; the product chooses whether to use them.

### Current call integration boundary

Handshake is designed to accompany ordinary operator phone calls and third-party
calling apps rather than replacing them with a Handshake-only call screen.

On Android, the native integration currently provides carrier call-state awareness
and an optional overlay. The overlay can remain visible above apps after the user
has granted overlay permission.

Handshake does **not** automatically receive private two-way audio from ordinary
carrier calls or third-party calling apps such as WhatsApp. Audio analysis therefore
cannot be presented as live call analysis until a supported platform surface is
independently verified.

For any interaction, the current reliable path is device-level trust: a paired
phone is recognized through the trust backend, and user-provided text can
additionally feed pressure analysis. The rotating-code routes remain available
server-side for backward compatibility but are no longer part of the mobile
user flow.

### Real-time call analysis direction

For a call type where the platform legitimately exposes an analyzable audio stream,
the intended pipeline is:

**audio → voice-activity detection → short rolling buffer → speech-to-text →
incremental risk analysis → risk engine → Protected / Verify / Risk → contextual
action.**

The LLM should analyze transcript chunks and derived context, not receive the raw
audio stream continuously. Target latency is roughly 1–2 seconds for a meaningful
risk update, but this is a future design target, not a measured performance claim.
Pressure analysis remains advisory: it is not a voice-clone detector and cannot
prove that a caller is genuine or fake.

### Android platform boundary

Android's CallScreeningService can support call screening/caller-ID integration,
while deeper in-call or controlled VoIP architectures may be needed when an app
must own the audio streams. A microphone foreground service can continue microphone
capture under Android's permission and background-execution rules, but
RECORD_AUDIO alone does not establish access to both sides of a carrier call.

The first technical step after the hackathon is a **native Android audio-feasibility
prototype** on the target Samsung A17. It should test incoming/outgoing carrier
calls, microphone, remote-audio availability, speakerphone, earpiece, Bluetooth,
foreground/background execution and the stream actually exposed to the chosen
native audio API.

Until this feasibility gate is passed, Handshake must not claim automatic
interception of every phone call, two-way carrier-call audio access, live
real-time phone-call analysis, cloned-voice detection or invisible background
listening.

See [ROADMAP.md](./ROADMAP.md) for the complete call-protection UX,
real-time-analysis pipeline, Android integration layers and phased plan.
## Honest limitations
- **In-memory trust store.** The trust backend keeps devices, invitations and
  sessions in memory per server instance. On serverless hosting with multiple
  instances, an enrollment or invitation created on instance A is invisible to
  instance B. Production requires a shared, durable store.
- **Legacy stateless pair secrets.** The `/api/code/*` compatibility routes still
  derive TOTP secrets with `HMAC-SHA256(PAIR_DERIVATION_KEY, pairId)`. They are
  kept only for backward compatibility, not as the primary identity mechanism.
- **The AI features are advisory.** The pressure check and challenge are LLM
  outputs: helpful signals, not guarantees. We do not claim detection accuracy
  numbers because we have not measured them and would not report unprovable
  ones.
- **Invitation misuse window.** A QR invitation is short-lived and single-use,
  but if a stranger scans it before the intended person does, they could accept
  and become a confirmed peer. Pairing should happen with both phones physically
  together.
- **Compromised device trust model.** Trust is bound to the devices you paired.
  If a paired phone is stolen, the stolen device can still take part in trusted
  sessions until it is revoked. Same model as any device-based credential.
- **No accounts in the demo.** The server-issued relation id is never shown to
  users, and enrollment uses per-device secrets rather than accounts; full
  accounts with auth and device-recovery flows are production work.

## Ethics & consent

- The voice clone used in the demo is of the **developer's own voice**, with
  consent. The clone has already been generated; any detector result must still be
  observed and recorded before being claimed.
- "Mom" is a role-played scenario for the demo; no real person is targeted, and
  no real scam is attempted.
- Transcripts are analyzed in memory by the LLM provider and are not stored by
  the app. Before any production use, the provider's data-retention and
  no-training policies must be reviewed (not yet done for this demo).

## Hackathon submission standard

ForgeHacks requires a **working AI-powered project** addressing a real-world
problem. The submission must include a project description, track selection, a
**public 2–4 minute demo video** showing the problem and how the project works,
a GitHub repository with source code and a clear README, a written description
covering the problem/target users, technical approach and real-world impact, and
supporting evidence such as screenshots, an architecture diagram, or a testing
deployment link.

The judging criteria explicitly include **Execution & Completeness**, which
looks at working demo, polish, usability, and how much was actually shipped.
Incomplete submissions missing the required video or code are not eligible for
judging.

Source: https://forgehacks-2026.devpost.com/ and
https://forgehacks-2026.devpost.com/rules

For Handshake, this means:

- the core verification flow must work for real;
- any AI feature presented as live must actually call the configured backend;
- screenshots/prerecorded footage are acceptable as clearly identified fallbacks
  or presentation aids, not as substitutes for a claimed live feature;
- external results such as a deepfake-detector classification must be observed
  before they are claimed;
- future mobile, Business, production, and other unshipped features should be
  labeled as future direction rather than represented as completed functionality.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — components, data flows, trust boundaries
- [SECURITY.md](./SECURITY.md) — plain-language threat model, mitigations and gaps
- [ROADMAP.md](./ROADMAP.md) — day-by-day plan, demo standard, and product direction
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — exact demo flow with evidence-based fallbacks
- [HACKATHON.md](./HACKATHON.md) — verified ForgeHacks submission requirements
