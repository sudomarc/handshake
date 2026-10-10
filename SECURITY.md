# Security and trust model

**Scope:** Handshake is a hackathon prototype, not a production security product or a security certification. Do not rely on it as the sole safeguard for urgent payments or other high-impact decisions.

## Current identity model

The primary mobile flow uses QR-based physical pairing and a backend-confirmed device/session trust protocol. The old rotating-code endpoints remain in the backend for compatibility; they are not the primary mobile identity flow.

A “Trusted connection” state means that the required device relationship and session checks succeeded. It does not prove that a person is honest, that a device is uncompromised, or that the voice on a call belongs to the device owner.

## Data and trust boundaries

- **Mobile device:** stores local pairing information and initiates trust sessions. A compromised or unlocked device can undermine the local trust relationship.
- **Trust backend:** validates request schemas, device proofs and session state. The current trust store is process-local in-memory state.
- **Pressure Check / Personal Challenge:** user-supplied transcript text and any relevant context may be sent from the server to the configured Featherless model when these features are invoked. The model response is untrusted input and is schema-validated before use.
- **Server credentials:** provider/API secrets must remain in server-side environment variables; never put them in the mobile bundle or commit them to the repository.

## Controls present in the prototype

- API inputs and model outputs use Zod schema validation.
- QR invitations are designed to be short-lived and single-use; the invite lifecycle and session protocol have automated tests.
- Trust sessions use nonces and expiry checks to reject replayed or expired proofs.
- Text-risk analysis is advisory and has bounded input/output handling and rate limiting.
- The call overlay is intended to report only available trust/call-state evidence. Microphone permission is not treated as proof that remote call audio is available.

These are implementation facts, not a substitute for an independent security review or complete physical-device validation.

## Known limitations and production blockers

### 1. Serverless persistence

`lib/trustStore.ts` keeps device enrollments, invitations and call sessions in process-local memory. Different serverless instances can have different state, and restarts can lose state. A production deployment needs shared, durable storage and tested consistency/expiry behavior.

### 2. Device-proof cryptography

The current proof construction is not the final production cryptographic design. The architecture documents a need to replace the current scheme with asymmetric device keys (for example Ed25519), public-key registration and a reviewed key lifecycle. Do not describe the current protocol as production-grade cryptography.

### 3. Call audio and caller identity

The current Android integration cannot obtain the remote side of ordinary carrier-call audio through the tested third-party capture path. WhatsApp does not expose its private two-way audio to this app. The app also cannot infer a caller's identity from call-state events alone.

Accordingly, live remote-speech transcription, live scam-risk analysis of ordinary carrier/WhatsApp calls, and cloned-voice detection are not implemented as verified capabilities.

### 4. Third-party call detection

Notification-based WhatsApp detection is not guaranteed in the current `main` release. A visible overlay is not proof that audio is captured or analysed. Test and describe popup behavior only from the actual APK and device evidence.

### 5. Abuse controls

Some rate limiting and store state are in-memory and per process. Serverless deployments can multiply or lose this state. Production requires distributed rate limits, durable replay protection, monitoring, retention policies and abuse-response procedures.

### 6. User-provided text and privacy

Treat transcripts, saved personal context, logs and model responses as sensitive, untrusted data. Do not put real passwords, API keys or unnecessary private information in transcripts, test fixtures or screenshots. A production release needs an explicit data-retention/deletion policy and privacy review.

## Required before production use

1. Replace process-local trust state with a shared durable database and test multi-instance behavior.
2. Complete a reviewed asymmetric-key design and threat-model review.
3. Run the final Android build through repeatable two-device tests, including denied permissions, offline behavior, carrier calls and third-party calling apps.
4. Keep call-audio claims strictly tied to evidence from supported OS APIs; do not add covert recording.
5. Add production-grade rate limiting, telemetry without sensitive payloads, key rotation and incident procedures.
6. Complete privacy, retention and user-consent review.

For the latest release-specific evidence and what remains unverified, see [the final release report](./docs/FINAL_STATUS_2026-10-10.md).
