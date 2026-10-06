<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository working rules

1. Read this file and the relevant project documentation before making changes.
2. Preserve the working hackathon core. Prefer the smallest correct change.
3. During the ForgeHacks mobile sprint, keep the root Next.js prototype/API intact except for a minimal correctness or compatibility fix.
4. Keep Personal mobile work isolated in `mobile/`.
5. Never present mockups, prerecorded outputs, simulated flows, or unverified platform capabilities as live functionality.
6. Treat user input, external model output, logs, and service responses as untrusted data; validate at boundaries.
7. For roadmap work, distinguish implemented now, planned, feasibility work, and production requirements.
8. Do not introduce a new framework, language, dependency, or architecture merely to support a future idea unless the current milestone requires it.
9. For documentation-only changes, verify links, headings, consistency, and scope.
10. Keep security and privacy claims proportional to evidence. Record unresolved risks rather than hiding them.

## Current product direction

Handshake Personal is the primary hackathon client. The long-term UX direction is
an automated, user-controlled trust layer around supported communication
sessions. Outside a call, Personal should be a calm trust center; during a
supported call/session, it should use a minimal **Call Protection Mode** with a
single understandable state such as **Protected / Verify / Risk**.

Pressure Check, Personal Challenge and rotating-code verification are capabilities
to be orchestrated rather than a manual toolbox. The intended orchestration is:

```text
communication session
  ↓
available trust / context / transcript / audio signals
  ↓
smallest useful verification or risk check
  ↓
Protected / Verify / Risk
  ↓
contextual action
```

Real-time call analysis is a future capability and is **not implemented merely by
requesting RECORD_AUDIO**. Android's microphone foreground services can continue
microphone capture under explicit permission and platform restrictions, but that
does not prove access to both sides of a carrier call. CallScreeningService is for
call screening/caller-ID integration, not a generic two-way call-audio feed.
Deeper in-call or controlled VoIP architectures may be required when application
ownership of call audio is necessary.

Before implementing real-time analysis, build and test a native Android feasibility
prototype on the target device to establish what audio is actually available for
incoming/outgoing carrier calls, speakerphone, earpiece, Bluetooth, foreground and
background states. Do not implement the full audio→STT→risk pipeline until that
gate is passed.

Do not claim automatic interception of every call, two-way carrier-call capture,
real-time live phone-call analysis, cloned-voice detection, invisible background
listening, or Android/iOS parity until each capability is independently verified
on-device.

Call analysis must remain explicit, user-controlled and privacy-preserving. Never
build covert surveillance or fabricate platform access.
