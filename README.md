# Handshake

**Verify the relationship, not the voice.**

Handshake is an Android-first prototype exploring ways to confirm a previously established trusted relationship and recognize manipulative language during high-pressure conversations. It was developed for the AI + Cybersecurity track at ForgeHacks 2026.

Handshake is **not** a voice-cloning detector. The current Android app does not receive or analyze remote audio from ordinary carrier calls or WhatsApp. A visible call overlay is not proof that a caller has been authenticated or that live speech analysis is running.

## The problem

A convincing voice clone can make an urgent request sound as though it came from a family member. Under pressure, a listener may have little time to question the request. Handshake explores a different signal: whether a device belongs to a trusted relationship established in advance, and whether text supplied by the user contains common pressure tactics.

## What is in the prototype

- **Trusted people and device pairing.** The mobile source includes a QR invitation, acceptance and confirmation flow, plus server-side device-trust and call-session routes. Verify the complete flow against the current build and deployed backend before describing it as working in a live demo.
- **Android call companion.** A native Android service can observe supported call-state events and display an optional overlay when the required permissions and service state allow it. Coverage is not guaranteed for every carrier or third-party calling app.
- **Pressure Check.** User-provided text can be submitted to an LLM-backed analysis endpoint. The result may highlight urgency, secrecy, payment pressure or impersonation. It is advisory and does not establish who is speaking.
- **Additional guidance.** The mobile project includes supporting verification and post-incident guidance flows. Check the build being demonstrated for availability.

## Important limitations

- Remote audio from ordinary carrier calls is not available through the current third-party Android capture approach.
- WhatsApp and other third-party calling apps do not expose their private two-way audio to Handshake.
- Live call transcription, real-time speech-risk analysis and cloned-voice detection are not available capabilities in this release.
- A call-state event or overlay is not identity proof. A trusted state must only be shown when the trust flow actually confirms it.
- Trust data is held in an in-memory store in the current prototype. It is not suitable for production-scale, multi-instance use or durable recovery.
- LLM-based text analysis can be wrong. Do not use it as the sole basis for sending money, sharing secrets or making a safety-critical decision.

See [implementation and verification status](./docs/FINAL_STATUS_2026-10-10.md) for historical test evidence and the validation steps required before a demo.

## How the product is intended to work

1. People establish a trusted relationship before a high-pressure interaction, using the available pairing flow.
2. During a supported call-state event, the companion layer can surface only the trust state the backend has actually confirmed.
3. When a suspicious request is received, the user can submit the text for an advisory pressure check.
4. If trust cannot be confirmed, the user should pause and verify through a separate, known communication channel.

## Architecture

Handshake has two main parts:

- **Web/API application:** Next.js App Router, TypeScript and server-side API routes.
- **Handshake Personal:** Expo / React Native with a native Android integration for supported call-state events and an optional overlay.

The backend provides device-trust and call-session endpoints, a text-analysis endpoint, and legacy rotating-code routes retained for compatibility. The rotating-code routes are not the primary mobile identity flow.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the component map and [SECURITY.md](./SECURITY.md) for the prototype threat model.

## Run the web/API application

Requirements: Node.js 20 or later and npm.

Install dependencies:

    npm ci

Copy .env.example to .env.local. On macOS/Linux:

    cp .env.example .env.local

On Windows PowerShell:

    Copy-Item .env.example .env.local

Set the variables required for the features you intend to use, then start the server:

    npm run dev

The web application is available at http://localhost:3000.

### Environment variables

| Variable | Purpose |
| --- | --- |
| FEATHERLESS_API_KEY | Server-side key for LLM-backed text analysis. Required for AI features. |
| FEATHERLESS_BASE_URL | Optional provider API base URL; the example defaults to Featherless. |
| FEATHERLESS_MODEL | Optional model identifier used by the provider client. |
| PAIR_DERIVATION_KEY | Server-side secret for legacy rotating-code compatibility routes. |

Never embed secrets in source code or commit .env.local. The configured provider receives the text submitted for analysis; do not submit confidential material.

## Tests and builds

Install dependencies in both the repository root and mobile directory. The root test command also exercises native config-plugin tests that require the mobile dependencies.

    npm ci
    cd mobile
    npm ci
    cd ..
    npm test
    npm run lint
    npm run build

Mobile static checks:

    cd mobile
    npm run typecheck
    npm run lint

A successful CI build validates only the checks included in that run. It does not prove that the latest APK works on a physical phone, that every calling app is detected, or that remote call audio is accessible.

## Android release builds

The Android release APK is produced by GitHub Actions. Check the [Android build workflow](https://github.com/sudomarc/handshake/actions/workflows/android-apk.yml) and download the artifact from a successful run. Pull-request verification is defined in the [Android QA workflow](https://github.com/sudomarc/handshake/actions/workflows/android-qa-apk.yml).

Before a demo, install the artifact produced from the commit being presented and run the relevant physical-device checks. Do not use an APK from an older commit as evidence for the latest source.

## Repository guide

| Path | Purpose |
| --- | --- |
| app/, components/, lib/ | Web application, API-facing UI and shared server logic |
| mobile/ | Handshake Personal mobile client and Android integration |
| tests/ | Web/API and shared-module tests |
| ARCHITECTURE.md | Architecture and principal data flows |
| SECURITY.md | Threat model and security limitations |
| ROADMAP.md | Product direction and remaining milestones |
| DEMO_SCRIPT.md | Evidence-based demo guide |
| HACKATHON.md | Judge-facing project context |
| docs/ANDROID_AUDIO_RESEARCH.md | Android platform research and audio-access boundaries |
| docs/CALL_AUDIO_FEASIBILITY.md | Technical feasibility prototype report |
| docs/ANDROID_FAKE_CALL_QA_2026-10-07.md | Historical Android call-overlay test evidence |
| docs/DEVICE_TEST_REPORT_2026-10-06.md | Historical device test report |

## Demo and evaluation

Use [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) to prepare a short, evidence-based demonstration. It distinguishes live behavior from fallback material and requires the presenter to disclose failures or unavailable functionality rather than stage a fictional result.

Handshake is a prototype, not a certified security product. Feature status must be based on the current source, successful build and observed behavior on the device used for the demonstration.
