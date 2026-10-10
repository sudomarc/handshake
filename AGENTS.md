<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository rules

1. Read this file and the relevant project documentation before making changes.
2. Preserve the working hackathon core. Prefer the smallest correct change.
3. Keep the root Next.js prototype/API intact except for a minimal correctness or compatibility fix.
4. Keep Personal mobile work isolated in `mobile/`.
5. Never present mockups, prerecorded outputs, simulated flows, or unverified platform capabilities as live functionality.
6. Treat user input, external model output, logs, and service responses as untrusted data; validate at boundaries.
7. Distinguish implemented now, planned, feasibility work, and production requirements.
8. Do not introduce a new framework, language, dependency, or architecture merely to support a future idea unless the current milestone requires it.
9. For documentation-only changes, verify links, headings, consistency, and scope.
10. Keep security and privacy claims proportional to evidence. Record unresolved risks rather than hiding them.
11. For Android call/overlay QA, read `docs/ANDROID_FAKE_CALL_QA_2026-10-07.md` before testing or changing related behavior. Physical call behavior may only be marked VERIFIED from direct device evidence. Never treat simulator/fake-call behavior as proof of real carrier or third-party-call audio access.

## Product direction

Handshake Personal is the primary hackathon client — an automated, user-controlled trust layer around ordinary phone calls and third-party calling apps. Outside active call use, Personal is a calm trust center. During an interaction, it surfaces one understandable state: **Trusted / Verify / Risk**.

Real-time call analysis is a future capability. Android's microphone foreground services can continue microphone capture under explicit permission, but that does not prove access to both sides of a carrier call. Do not claim automatic access to every calling app's audio, real-time analysis of third-party call audio, cloned-voice detection, invisible background listening, or Android/iOS parity until each capability is independently verified on-device.

Call analysis must remain explicit, user-controlled and privacy-preserving. Never build covert surveillance or fabricate platform access.
