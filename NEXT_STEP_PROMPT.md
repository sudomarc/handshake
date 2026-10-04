# Next Step — Build Handshake Personal Mobile for ForgeHacks

Repository: `sudomarc/handshake`

## Objective

Build the **Handshake Personal mobile app** as the primary user-facing
deliverable for ForgeHacks 2026.

The existing Next.js web app must remain intact. Do **not** convert the root web
app into React Native and do not replace the web implementation.

Create an isolated mobile client, preferably under:

`mobile/`

The mobile app should use:

- React Native
- Expo
- TypeScript
- Expo Router

Use the current stable Expo/React Native versions documented by the official Expo
and React Native documentation at implementation time. Do not hard-code an old
SDK version from this prompt.

Official references:
- https://docs.expo.dev/
- https://docs.expo.dev/guides/typescript/
- https://docs.expo.dev/router/introduction/
- https://reactnative.dev/docs/typescript

## Product decision

The hackathon target is **Personal**, not Business.

### Personal
Mobile app for:
- families;
- individuals;
- trusted relatives/friends;
- people who may be vulnerable to voice-clone/social-engineering scams.

### Business
Do NOT build the Business product in this task.

The current Next.js web app will be preserved for later evolution into the
Business web product.

## Critical scope rule

The mobile app must be a **real working application**, not a visual mockup.

The core flow must actually work against the existing backend:

create/use trusted pair
→ caller and receiver use two devices
→ same rotating code
→ claimed code submitted
→ real server verification
→ Verified / Not verified

Do not replace this with fake local state or success animations.

## Preserve the existing web app

Before changing anything:

1. Read `AGENTS.md`.
2. Read `ARCHITECTURE.md`.
3. Read `SECURITY.md`.
4. Read `ROADMAP.md`.
5. Read `HACKATHON.md`.
6. Read the current web API routes and schemas.
7. Read the official Expo/React Native documentation relevant to the selected
   architecture.

The root Next.js application is a valuable existing implementation.

Do not:
- rewrite the web app as mobile;
- remove web routes;
- duplicate or rewrite server-side security logic unnecessarily;
- weaken the existing TOTP implementation;
- expose `FEATHERLESS_API_KEY`;
- expose `PAIR_DERIVATION_KEY`.

Only make root web changes when required for API compatibility, shared contract
clarity, a real bug fix, or a security fix.

## Existing backend contract

Current API routes include:

- `POST /api/circle`
- `GET /api/code/current?pairId=...`
- `POST /api/code/verify`
- `POST /api/analyze`
- `POST /api/challenge`

Current response contracts are defined in:

`lib/schemas.ts`

Do not invent a second incompatible API.

The mobile client should consume the existing API where possible.

## Environment configuration

The mobile app needs a configurable API base URL.

Do not hard-code:
`localhost`

Support a public/deployed URL and a local-network development URL.

Example concept:

`EXPO_PUBLIC_API_BASE_URL`

Validate the value and document how to use it.

Do not place server secrets in Expo environment variables.

## Mobile UX principle

The user should not see Handshake as a toolbox.

Avoid exposing the internal architecture as:

- Pressure Check
- Personal Question
- TOTP
- AI analysis
- security engine

as separate choices on the main flow.

The user should primarily think:

> **I want to verify this person.**

Handshake should handle the underlying checks automatically wherever the available
signals/data allow it.

For this first mobile implementation, the genuinely available core signal is
the trusted-pair rotating-code verification.

Do NOT pretend that the mobile app can automatically listen to arbitrary cellular
call audio. That capability is platform-dependent and is not present in the
current backend.

## Required mobile screens

Implement a polished but focused Personal MVP.

### 1. Home

Primary action:

**Verify a person**

Secondary:

**My trusted people**

Do not expose a large "Other tools" menu on the main Personal experience.

### 2. Trusted people

Show trusted relationships using human language.

The user should understand:
- who the trusted person is;
- why the relationship exists;
- how to start verification.

Do not make the raw 32-character pair ID the visual center of the experience.

### 3. Add trusted person

Create the pair through the existing API.

Give clear instructions for establishing the relationship on the two devices.

If the current API cannot store a human-readable contact name, do not fake server
persistence. Keep any local display metadata explicitly local and document that
limitation.

### 4. Verification flow

A receiver starts:

**Verify this person**

Then:

- clear instruction;
- current rotating code;
- code input;
- check action;
- loading state;
- real Verified state;
- real Not verified state;
- rate-limit/error state.

The final result must be visually dominant.

For Not verified, clearly advise:

**Do not send money. Hang up and call the person back using a number you already
know.**

### 5. Caller code screen

Optimize for a person reading the code aloud:

- huge digits;
- excellent contrast;
- countdown;
- minimal distractions;
- readable on a phone held at arm's length.

### 6. Demo path

Provide a reliable way to create/use a demo pair so two devices can test the
real API flow.

This can be separate from normal Personal onboarding if necessary, but it must
not fake verification.

## Design requirements

The current web prototype had a weak dark/black visual language.

Do not copy that visual system blindly into mobile.

Create a real mobile design system with:

- strong contrast;
- accessible typography;
- clear primary action;
- clear semantic success/error states;
- calm visual hierarchy;
- touch-friendly controls;
- generous spacing;
- polished loading states;
- no unnecessary decorative effects.

The app must look like a consumer trust/safety product, not a developer dashboard.

Do not spend most of the task on visual decoration before the real verification
flow works.

## State persistence

For the hackathon MVP, decide explicitly how the mobile client remembers trusted
pair information.

A secure local storage mechanism is preferable for pair identifiers because the
current architecture treats the pair ID as a membership secret.

Do not claim full account/device security: the backend currently has no real
user accounts or device enrollment.

## Android APK

The hackathon needs a genuinely testable Android build.

Use Expo/EAS according to current official documentation.

Expo documents that Android APK artifacts can be produced by configuring an EAS
build profile with `android.buildType: "apk"`, while AAB is the normal Play
Store artifact:

https://docs.expo.dev/build-reference/apk/

Prepare at minimum:

- development/test workflow;
- an Android APK build profile;
- application name/icon/splash configuration;
- reproducible build instructions.

Do not claim that an APK has been built unless the build actually succeeds.

## Validation

After implementation, run all relevant checks.

At minimum:

### Web regression

`npm run lint`
`npm run build`
`npm run format:check`

### Mobile

Use the package manager scripts actually created for the mobile app.

Also run TypeScript checking.

Start the Expo development server and perform an actual device/emulator test.

## Real two-device test

This is mandatory before declaring the mobile MVP complete.

Device A:
- Personal mobile app;
- receiver flow.

Device B:
- Personal mobile app;
- caller flow.

Both must use the same pair.

Verify:

1. same current code appears;
2. code rotates;
3. correct claimed code returns Verified;
4. incorrect claimed code returns Not verified;
5. rate limiting still works;
6. errors are human-readable.

## APK verification

If an EAS APK is built:

1. install it on a real Android device or emulator;
2. configure the real API base URL;
3. run the same two-device verification test;
4. record the build identifier/link;
5. do not call it release-ready unless it has actually been tested.

## Security constraints

Never move these into the mobile client:

- `FEATHERLESS_API_KEY`
- `PAIR_DERIVATION_KEY`
- TOTP secrets
- server-only prompt logic

The mobile app may receive short-lived rotating codes and submitted verdicts
according to the existing API contract.

Do not disable existing rate limiting, zod validation, or server-side checks.

## What is explicitly out of scope

Do NOT build now:

- Handshake Business dashboard;
- company management;
- billing;
- enterprise administration;
- full production authentication;
- production-grade device management;
- arbitrary cellular-call audio interception;
- fake automatic voice analysis;
- a second incompatible backend;
- a Play Store release process beyond what is necessary to build/test an APK.

## Definition of done

The task is complete only when:

- `mobile/` contains a real Expo/React Native/TypeScript app;
- root Next.js web prototype still builds;
- mobile home/trusted people/verification/caller flows exist;
- mobile talks to the real existing API;
- two real devices can complete a real verification;
- correct and incorrect codes produce real server-backed results;
- Android APK build configuration exists;
- APK/build is actually tested if claimed;
- no server secret is exposed;
- lint/type/build checks pass;
- final diff has been inspected.

## Final report

Return:

1. mobile architecture;
2. files created/modified;
3. API integration details;
4. UI/UX changes;
5. commands executed;
6. real device/emulator tests;
7. APK build result;
8. any web changes and why they were necessary;
9. known limitations;
10. exact next step.

Never report a feature as complete unless it was actually implemented and tested.
