# ForgeHacks 2026 — Handshake submission notes

**Last reconciled with the repository:** 2026-10-10  
**Submission deadline listed in the official rules:** Saturday, October 10, 2026, 12:00 PM EDT (16:00 UTC).

Official sources:
- https://forgehacks-2026.devpost.com/
- https://forgehacks-2026.devpost.com/rules

## Submission requirements

The rules and submission page require a working AI-powered project, a public GitHub repository, project information describing the problem and technical approach, and a public demo video of **2–4 minutes maximum**. The rules state that missing the required code or video makes a submission ineligible for judging. Confirm the latest requirements directly on Devpost before submitting.

## What Handshake is

Handshake is an Android-first prototype for checking device-level trust around calls. Two people pair their phones using a short-lived QR invitation; both confirm the relationship. When the app can observe a supported call-state event, the Android overlay can display a trust state based on available evidence.

The complementary Pressure Check analyses text provided by the user for manipulation tactics. It is advisory and does not establish who is speaking.

## What must not be claimed

- Handshake does not detect cloned voices.
- The current implementation does not receive or analyse the remote audio of ordinary carrier calls or WhatsApp calls.
- An overlay appearing during a call does not mean the conversation is being transcribed or analysed.
- WhatsApp call-event detection is not guaranteed in the current `main` branch; notification-listener work remains outside the audited release commit.
- Device trust is only as reliable as the enrolled devices, backend response and session checks. It is not an absolute guarantee that a person is honest or that a device is uncompromised.

## Evidence and release status

Use [the final release report](./docs/FINAL_STATUS_2026-10-10.md) for the latest CI result, release artifact, on-device gaps and production limitations. It separates source implementation, automated CI evidence and physical-device evidence.

CI checks do not replace testing the exact release APK on a phone. If QR pairing or call overlay behavior fails on the APK being demonstrated, report the observed result; do not substitute a mockup or a simulated success.

## Demo guidance

A credible demo can show the real QR pairing flow (only after verifying both phones), then run Pressure Check on an explicitly supplied example transcript and explain its advisory result. State clearly that Handshake is checking device trust, not analysing the live call audio. A voice-clone sample may illustrate the problem, but it must not be presented as audio that Handshake has detected or classified.
