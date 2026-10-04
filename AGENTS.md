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

Handshake Personal is the primary hackathon client. The long-term UX direction is an automated, user-controlled trust layer around supported communication sessions. Call-aware/background behavior is a future phase and must be validated against real mobile OS capabilities before being described as implemented.
