# NEXT STEP — BUILD HANDSHAKE PERSONAL MOBILE FOR FORGEHACKS

Repository: `sudomarc/handshake`

## Objective

The **primary ForgeHacks 2026 deliverable is Handshake Personal**, a real mobile
application for families and individuals.

Build the mobile client without replacing the existing Next.js application.

Create an isolated Expo project under:

`mobile/`

The existing root web application remains in place and should be treated as the
current working prototype/API reference. Do not migrate it to React Native and do
not broadly rewrite it during this task.

## Competition constraint

ForgeHacks requires a **working AI-powered project** addressing a real-world
problem, plus a public 2–4 minute demo video, source code/README, project
description and supporting evidence. Execution & Completeness explicitly values
working demo, polish and usability.

Primary rule source:
https://forgehacks-2026.devpost.com/rules

Therefore the mobile app must be a genuine working implementation, not a
click-through simulation.

## Technology

Use:
- React Native
- Expo
- TypeScript
- Expo Router

Use the **current stable Expo SDK and compatible React Native version** from the
official docs at implementation time. Do not copy an obsolete SDK version from
this prompt.

Official references:
- https://docs.expo.dev/
- https://docs.expo.dev/guides/typescript/
- https://docs.expo.dev/router/introduction/
- https://reactnative.dev/docs/typescript/

## Product split

### Handshake Personal — NOW / HACKATHON

Mobile app for:
- families;
- individuals;
- trusted relatives/friends;
- users vulnerable to social-engineering scams.

### Handshake Business — AFTER HACKATHON

Web product for:
- organizations;
- teams;
- administrators.

Do not build Business now.

The existing Next.js web application will become the starting point for Business
after the hackathon.

### Handshake Core

Reuse the current server/API and security logic.

Do not duplicate TOTP/secret/security logic inside the client.

## Preserve the web prototype

Before coding:

1. Read `AGENTS.md`.
2. Read `ARCHITECTURE.md`.
3. Read `SECURITY.md`.
4. Read `ROADMAP.md`.
5. Read `HACKATHON.md`.
6. Read current API routes and `lib/schemas.ts`.
7. Read local Next.js documentation required by `AGENTS.md`.
8. Read official Expo and React Native documentation.

Do not broadly rewrite the root web app.

Root web changes are allowed only for an actual:
- API compatibility issue;
- correctness bug;
- security issue;
- shared contract improvement.

If you touch root web code, explain why and run its regression checks.

## Existing backend

Current routes:
- `POST /api/circle`
- `GET /api/code/current?pairId=...`
- `POST /api/code/verify`
- `POST /api/analyze`
- `POST /api/challenge`

Contracts:
`lib/schemas.ts`

Core flow:

```
create/use trusted pair
       ↓
two devices
       ↓
same rotating code
       ↓
claimed code submitted
       ↓
server verification
       ↓
Verified / Not verified
```

Use the real API. Do not create a second incompatible backend.

## API base URL

Use a configurable Expo environment variable, for example:

`EXPO_PUBLIC_API_BASE_URL`

It must support:
- local network development;
- deployed/public API.

Never hard-code `localhost`.

Never put:
- `FEATHERLESS_API_KEY`
- `PAIR_DERIVATION_KEY`
- TOTP secrets

in mobile environment variables.

## Personal UX

Personal should not feel like a toolbox.

The main experience should be:

> **Verify a person**

not:

> choose Pressure Check / Personal Question / TOTP / AI tool.

Handshake should orchestrate internal checks where the necessary data exists.

For the first mobile MVP, the real mandatory signal is the trusted-pair rotating
code.

Do NOT pretend the app can automatically intercept arbitrary cellular-call audio.

Do NOT claim automatic cellular deepfake detection that is not implemented.

## Required screens

### Home

Primary:
**Verify a person**

Secondary:
**My trusted people**

Avoid a prominent "Other tools" section in the Personal main flow.

### Trusted people

Show trusted relationships in human language.

Allow creation/use of the trusted pair using the existing API.

Do not make the raw 32-character pair ID the center of the UI.

### Verify

Receiver flow:
- person/relationship context where available;
- simple instruction;
- current code;
- claimed-code input;
- check action;
- loading;
- real Verified;
- real Not verified;
- rate-limited/error states.

Failure guidance must clearly say:

**Do not send money. Hang up and call the person back using a number you already
know.**

### Caller code

Dedicated screen optimized for reading aloud:
- huge digits;
- strong contrast;
- countdown;
- progress;
- minimal distractions.

### Demo

Provide a reliable way to create/use a demo pair for two-device testing without
faking results.

## AI features

Do not force the current AI routes into the main Personal navigation.

They are internal signals for the automated future architecture.

For the hackathon:
- only show an AI feature as live if it really calls the configured backend;
- otherwise label it future or clearly identified fallback;
- never fabricate an AI result.

## Design

The current web UI uses a very dark/black visual language and has known visual
weaknesses.

Do not reproduce that design mechanically.

Create a proper mobile design system:
- high contrast;
- accessible typography;
- large touch targets;
- calm safety-oriented visual language;
- strong action hierarchy;
- clear success/error states;
- polished loading/empty states;
- restrained, purposeful motion only.

The result should look like a credible consumer safety product.

## Local persistence

Persist the pair data needed for the MVP locally using an appropriate secure
storage mechanism.

Do not claim production-grade account/device security.

The current backend has no real user accounts or device enrollment.

## Android APK

The hackathon needs a genuinely testable Android build.

Expo/EAS documents APK builds through an EAS profile using
`android.buildType: "apk"`:

https://docs.expo.dev/build-reference/apk/

Configure a build profile for APK testing/demo.

Do not report an APK as available until the build has actually succeeded.

## Validation

### Web regression
Run:
```
npm run lint
npm run build
npm run format:check
```

### Mobile
Run the mobile project's typecheck/lint/build checks.

Start Expo and test on a real Android device or emulator.

### Mandatory two-device test

Device A:
- Handshake Personal mobile receiver flow.

Device B:
- Handshake Personal mobile caller flow.

Verify:
1. same pair;
2. same current code;
3. code rotation;
4. correct code → real Verified;
5. wrong code → real Not verified;
6. rate limit/error behavior.

### APK test

If an APK is built:
1. install it on a real Android device/emulator;
2. point it to the actual API;
3. run the two-device flow;
4. record the build artifact/link;
5. report failures honestly.

## Security

Never move secrets/client-only:
- `FEATHERLESS_API_KEY`
- `PAIR_DERIVATION_KEY`
- raw TOTP secrets
- server-side prompt logic.

Do not disable:
- zod validation;
- rate limiting;
- server-side verification;
- prompt fences;
- server-side secret handling.

## Out of scope

Do not build:
- Business dashboard;
- billing;
- enterprise administration;
- full production auth;
- production device management;
- arbitrary cellular-call audio interception;
- fake automatic voice/deepfake detection;
- Play Store submission;
- a second backend.

## Definition of done

Complete only when:
- `mobile/` contains a real Expo/React Native/TypeScript app;
- root web app still passes regression checks;
- Home/Trusted People/Verify/Caller Code flows exist;
- mobile uses the existing real API;
- two-device verification works for real;
- correct/wrong codes produce real server-backed verdicts;
- Android APK build configuration exists;
- APK testing is reported honestly;
- no server secret is exposed;
- final diff is inspected.

## Final report

Return:
1. mobile architecture;
2. files created/modified;
3. API integration;
4. UI/UX decisions;
5. commands/tests executed;
6. emulator/device results;
7. APK build result;
8. root-web changes and justification;
9. known limitations;
10. next step.

Never call a feature complete unless it was actually implemented and tested.
