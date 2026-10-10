# Handshake

> **The voice can be cloned. The person can still prove who they are.**

Handshake helps you verify _who is actually on the other end_ of a phone call or
message — even when the voice sounds exactly like someone you love. Instead of
trying to detect the fake (an arms race that voice detectors keep losing),
Handshake checks something a clone can never have: a phone that you paired and
confirmed, in person, before the call.

Built for the **AI + Cybersecurity** track at ForgeHacks 2026.

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

The real person's paired phone is recognized automatically — no matter how
perfect the fake is.

## Features

### Implemented and verified

- **Automatic trusted-call recognition (QR pairing).** Add a trusted person by
  putting two phones together: tap **"Show my QR"** on one and **"Scan a QR"**
  on the other. The invitation is short-lived and single-use; both people
  confirm on their own phones, and the relationship is mutual. No code to type
  or read out loud. During a call, Handshake recognizes a previously paired
  device and shows one of three honest states: **Trusted connection** (both
  phones confirmed and the backend verified the session), **Verify** (peer
  offline / not paired / backend unreachable), or **Risk detected** (a real
  local risk signal). It never shows "Protected" without evidence.
- **Pressure check (AI).** Paste what the caller said (a transcript or message).
  An LLM flags manipulation tactics — artificial urgency, secrecy, immediate
  payment, authority pressure — and returns a risk level plus reasons, as
  validated structured data. Advisory, not a verdict.
- **Personal question (AI).** After a meaningful pressure signal, Handshake can
  generate a private verification question for the trusted person. An internal
  capability; users don't have to choose it as a separate tool.
- **The first hour.** A calm, static checklist for the 60 minutes after money
  has already moved. No AI, no decisions made under stress — just the right
  steps, in order.

### Implemented but not verified in real conditions

- **Automatic recognition during a real carrier call.** The app detects
  carrier call state and the trust protocol is implemented, but end-to-end
  recognition during a physical carrier call has not been verified on a real
  SIM call. The QA gate uses a fake-call app, which exercises platform policy
  but is not evidence of carrier-call audio access.

### Known limitations

- **In-memory trust store.** The trust backend keeps devices, invitations and
  sessions in memory per server instance. On serverless hosting with multiple
  instances, an enrollment or invitation created on instance A is invisible to
  instance B. Production requires a shared, durable store.
- **AI features are advisory.** The pressure check and challenge are LLM
  outputs: helpful signals, not guarantees. No detection accuracy numbers are
  claimed because they have not been measured.
- **Invitation misuse window.** A QR invitation is short-lived and single-use,
  but if a stranger scans it before the intended person does, they could accept
  and become a confirmed peer. Pairing should happen with both phones physically
  together.
- **Compromised device trust model.** Trust is bound to the devices you paired.
  If a paired phone is stolen, the stolen device can still take part in trusted
  sessions until it is revoked. Same model as any device-based credential.
- **No accounts in the demo.** The server-issued relation id is never shown
  to users, and enrollment uses per-device secrets rather than accounts; full
  accounts with auth and device-recovery flows are production work.
- **No real-time call analysis.** Handshake does not automatically receive
  private two-way audio from carrier calls or third-party calling apps. Audio
  analysis cannot be presented as live call analysis until a supported platform
  surface is independently verified.

### Future direction

- **Real-time call analysis** for a communication surface whose audio is
  legitimately exposed to the application: audio → voice-activity detection →
  short rolling buffer → speech-to-text → incremental risk analysis → risk
  engine → Trusted / Verify / Risk → contextual action. Not implemented today.
- **Production trust model** — real accounts, durable device enrollment and
  revocation, persistent encrypted trust relationships, durable/distributed
  abuse controls, privacy and retention controls, and clear recovery flows.

## Architecture

```
Handshake Personal (Android)
    ↓
Protection-ready home
    ├── Trusted people (QR pairing: invite → accept → confirm)
    ├── Automatic device recognition during calls
    └── Honest overlay: Trusted / Verify / Risk detected
          ↓
    Trust backend
    ├── QR invitations (/api/trust/invite*)
    ├── Device enrollment (/api/trust/enroll)
    ├── Call sessions + attestation (/api/trust/session*)
    └── Revocation (/api/trust/revoke)

Android companion layer
    ├── Operator call-state awareness
    └── Optional warning overlay above phone and calling apps

Next.js backend
    ├── Trust protocol (device proof + session attestation)
    ├── Pressure analysis (/api/analyze)
    └── Legacy code-verification routes (/api/code/*,
        /api/circle) kept for backward compatibility
```

The mobile client does not replace the system Phone app and does not create a
Handshake-only call. For WhatsApp and other third-party calling apps,
Handshake is a companion layer: the overlay stays visible with overlay
permission, and call recognition only ever reports what the trust backend
actually confirmed. Handshake does not claim automatic access to private
two-way audio from those apps.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full component map, data
flows and trust boundaries.

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
- **Stateless HMAC derivation** for the legacy TOTP pair secrets · hosted on
  **Vercel**

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

## Tests and build

```bash
npm test                 # TypeScript test suite (145 tests)
```

The Android APK is built via GitHub Actions (see
`.github/workflows/android-apk.yml`). The workflow runs the test suite before
the Gradle build. No local Android SDK is required.

## Demo

The product demo is a two-phone QR pairing flow:

1. pair two phones by QR (one shows, one scans);
2. both people confirm on their own phones;
3. a call from the paired device is recognized automatically and shows
   **Trusted connection**;
4. an unpaired or offline peer shows **Verify** — never a false "Protected";
5. a real local risk signal shows **Risk detected**.

The AI features should call the configured Featherless endpoint when they are
presented as working features. A screenshot, prerecorded clip, or visual mockup
may be used as a **fallback or presentation aid**, but it must never be
described as a live feature when it is not actually connected and working.

Full step-by-step script, roles, preflight checks and fallbacks:
[DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Security and privacy

See [SECURITY.md](./SECURITY.md) for the full threat model.

In short:

- The browser is untrusted: everything it sends is validated with zod.
- Secrets exist only in server environment variables. The LLM provider receives
  only the transcript — never any secret.
- The trust backend keeps devices, invitations and sessions in memory per
  server instance. Production requires a shared, durable store.
- The AI features are advisory: they analyze text transcripts, not voices, and
  are not voice-clone detectors.
- Handshake does not automatically receive private two-way audio from carrier
  calls or third-party calling apps.

## Ethics & consent

- The voice clone used in the demo is of the **developer's own voice**, with
  consent.
- "Mom" is a role-played scenario for the demo; no real person is targeted, and
  no real scam is attempted.
- Transcripts are analyzed in memory by the LLM provider and are not stored by
  the app. Before any production use, the provider's data-retention and
  no-training policies must be reviewed (not yet done for this demo).

## Project status

Handshake is a working hackathon prototype. The pairing and recognition flow
is implemented and unit-tested. The AI features are implemented and call the
configured backend. The Android app builds and installs. Real carrier-call
audio analysis is a future capability, not a shipped feature.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — components, data flows, trust boundaries
- [SECURITY.md](./SECURITY.md) — plain-language threat model, mitigations and gaps
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — exact demo flow with evidence-based fallbacks
- [docs/TRUSTED_CALL_ARCHITECTURE.md](./docs/TRUSTED_CALL_ARCHITECTURE.md) — trusted call architecture
- [docs/ANDROID_AUDIO_RESEARCH.md](./docs/ANDROID_AUDIO_RESEARCH.md) — Android audio access research
- [docs/ANDROID_FAKE_CALL_QA_2026-10-07.md](./docs/ANDROID_FAKE_CALL_QA_2026-10-07.md) — Android QA gate
