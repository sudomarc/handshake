# ForgeHacks 2026 — Submission Requirements

Last checked: **2026-10-04**

Primary sources:

- https://forgehacks-2026.devpost.com/
- https://forgehacks-2026.devpost.com/rules

## Dates (from the official Rules tab)

- Hackathon begins: **October 3, 12:00 PM EST**
- Submission deadline: **October 10, 2026, 12:00 PM EDT**
- Judging period: October 10–11
- Winners announced: October 12, 3:00 PM EST

Also from the official rules: teams of 1–4 students; code must be publicly
viewable; projects must be substantially created during the hackathon period;
one submission per team. Track prompts: AI + Healthcare, AI + Education,
AI + Climate, AI + Business, AI + Cybersecurity, AI + Creativity.

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

### Hackathon deliverable — Handshake Personal mobile

The **primary user-facing hackathon product is Handshake Personal**, a real
mobile app for families and individuals.

The mobile app must genuinely demonstrate:

- trusted-person setup/pair creation;
- rotating codes;
- two-device verification;
- real **Verified / Not verified** results;
- the AI feature(s) actually included in the demo, when their backend is
  configured and tested;
- a usable Android build (APK) for testing/demo.

The current Next.js web app remains in the repository as the existing working
web prototype and API/reference client. Do not discard or broadly rewrite it
during the mobile implementation.

### Post-hackathon direction

After the hackathon:

- **Handshake Business** becomes the dedicated web product for organizations;
- **Handshake Personal** continues as the mobile product;
- both clients use a shared Handshake Core/API;
- Personal moves toward automated orchestration rather than exposing internal
  security/AI tools as separate user choices;
- production accounts, device enrollment/revocation, persistent storage and
  production-grade abuse controls are added before any real consumer-security
  claim.

## Final submission checklist

- [ ] Handshake Personal mobile core verified on two devices.
- [ ] Android APK/build artifact or equivalent testable mobile build available.
- [ ] Public demo/testing evidence available where applicable.
- [ ] Public 2–4 minute video uploaded.
- [ ] Video explains the problem and demonstrates how Handshake works.
- [ ] GitHub repository is accessible and contains source code + clear README.
- [ ] Written description covers problem, target users, technical approach, and impact.
- [ ] Correct ForgeHacks track identified.
- [ ] Screenshots/architecture/deployment evidence included.
- [ ] Every live claim is backed by an actual test.
- [ ] Fallback footage is clearly treated as fallback.

## Submission checklist status (audit 2026-10-05)

Tags: **VERIFIED** / **OWNER-REPORTED** (no evidence in repo) / **NOT VERIFIED** / **OPEN**.

- Public repository — **VERIFIED** (`sudomarc/handshake`, GitHub API `private: false`).
- Source code + README — **VERIFIED** present; README needs a final pass (ROADMAP F4) — **OPEN**.
- Working build — **OWNER-REPORTED** (Vercel backend, EAS APK, Samsung A17). Mobile
  type check and lint pass (**VERIFIED**). Evidence link/screenshots — **OPEN**.
- Two-physical-device validation — **NOT VERIFIED**.
- Demo script — aligned with the real mobile product (this audit) — rehearsal **OPEN**.
- Public 2–4 min video — **OPEN**.
- Written description (problem/target users, technical approach, impact) — **OPEN**.
- Track — README states **AI + Cybersecurity**; confirm the same selection on Devpost — **OPEN**.
- Links to collect for Devpost: repository URL, video URL, deployed API URL
  (`https://handshake-pi-amber.vercel.app`, from `mobile/eas.json`), APK/EAS build
  link, screenshots, architecture diagram.
- Deadline — Sat Oct 10, 2026, 12:00 PM EDT; target submission Fri Oct 9.
- Judging — keep the story on the working core (rotating-code verification on two
  phones); present Pressure check as advisory text analysis only.
