# ForgeHacks 2026 — Submission Requirements

Last checked: **2026-10-04**

Primary sources:
- https://forgehacks-2026.devpost.com/
- https://forgehacks-2026.devpost.com/rules

## What ForgeHacks requires

ForgeHacks describes the build requirement as a **working AI-powered project**
that addresses a real-world problem in one of its official tracks. The project
must demonstrate clear AI/ML use and tangible value.

The submission requirements include:

1. Project title and short description.
2. Official track selection.
3. A **public demo video, 2–4 minutes maximum**, showing:
   - the problem being solved;
   - how the project works.
4. A GitHub repository containing the source code and a clear README.
5. Written project information covering:
   - problem statement and target users;
   - technical approach and components;
   - real-world impact.
6. Supporting screenshots, architecture diagram, or a deployment/testing link.

The rules state that submissions missing the required video or code are not
eligible for judging.

## How this applies to Handshake

### Must be genuinely functional

The central Handshake verification flow should be real and testable:

```
create trusted pair
       ↓
two devices
       ↓
same rotating code
       ↓
claimed code entered
       ↓
real server verification
       ↓
Verified / Not verified
```

Any AI feature presented as a live feature must also be connected to the
configured backend and produce its result during the demonstration or be clearly
identified as a prerecorded fallback.

### What can be a fallback

A screenshot or prerecorded clip can be used to recover from:

- network failure;
- unavailable external service;
- slow/unavailable AI provider;
- detector downtime;
- other demo-day failures.

It must be described as a **fallback/presentation aid**, not as proof that the
live feature is currently functioning.

### What must never be faked

Do not:

- trigger a fake animation that claims verification without checking the code;
- invent a detector result;
- invent an AI result;
- claim an unimplemented mobile application as shipped;
- claim an unimplemented Business product as shipped;
- describe future architecture as current functionality.

## Judging implications

The Devpost judging rubric includes:

- Real-World Impact & Relevance
- Technical Implementation & AI Use
- Innovation & Creativity
- **Execution & Completeness**
- Presentation & Communication

For Handshake, the practical priority is therefore:

**working core → strong real-world story → evidence-backed AI use → polish/usability → clear presentation.**

The core does not need to be a production-ready commercial product. It does
need to be real enough for a judge to understand and verify what was actually
built during the hackathon.

## Current Handshake strategy

### Live prototype

Keep the following genuinely working:

- Trusted Circle;
- rotating codes;
- two-device verification;
- Verified / Not verified result;
- AI features that are actually configured and tested if included in the demo;
- public testing/deployment evidence.

### Future direction

These may be shown as product vision, but should be labeled as future work:

- Handshake Personal React Native + Expo + TypeScript app;
- Android APK/AAB distribution and iOS distribution;
- Handshake Business web platform;
- shared Handshake Core;
- automated orchestration where Handshake selects internal checks;
- production accounts, device enrollment/revocation, persistent storage and
  production-grade abuse controls.

## Final submission checklist

- [ ] Working core verified on two devices.
- [ ] Public demo URL/testing link available where applicable.
- [ ] Public 2–4 minute video uploaded.
- [ ] Video explains the problem and demonstrates how Handshake works.
- [ ] GitHub repository is accessible and contains source code + clear README.
- [ ] Written description covers problem, target users, technical approach, and impact.
- [ ] Correct ForgeHacks track identified.
- [ ] Screenshots/architecture/deployment evidence included.
- [ ] Every live claim is backed by an actual test.
- [ ] Fallback footage is clearly treated as fallback.
