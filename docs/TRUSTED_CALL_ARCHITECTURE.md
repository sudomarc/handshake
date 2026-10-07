# Handshake Trusted-Call Architecture

**Date:** 2026-10-07  
**Status:** IMPLEMENTED (source-verified, pending device re-test)  
**Supersedes:** The old rotating-code verification model for call-time identity

---

## 1. Current Architecture

Handshake Personal is an automated, user-controlled trust layer around phone calls.
The product direction is:

```
TRUSTED PEOPLE ARE ESTABLISHED BEFORE THE CALL
  ↓
TWO HANDSHAKE DEVICES AUTHENTICATE EACH OTHER DURING THE CALL
  ↓
TRUSTED RELATIONSHIP IS CONFIRMED AUTOMATICALLY
  ↓
OVERLAY APPEARS DURING THE CALL
  ↓
WHEN HANDSHAKE CONTROLS THE AUDIO:
AUDIO → VAD → STT → RISK ENGINE
  ↓
PROTECTED / VERIFY / RISK
```

### Key properties

- **No spoken codes.** Users never read, say, or type a verification code during a call.
- **No manual call-time verification.** Trust is established automatically between enrolled devices.
- **Honest overlay.** The overlay never claims "Protected" without a confirmed trusted-pair session.
- **Privacy-preserving.** Raw audio is never uploaded; only short-lived text transcriptions leave the device.
- **Platform-honest.** No claim of carrier-call or third-party audio access without independent device evidence.

---

## 2. Trusted-Person Enrollment Model

### Pre-call trust establishment

Users add trusted people **before** the call through the Trusted people screen:

1. **Create connection** — generates a new `pairId` (the shared membership secret for the circle).
2. **Join connection** — enters a `pairId` shared by the other person.
3. **Device enrollment** — creating or joining a connection also enrolls this phone with the trust backend (`POST /api/trust/enroll`).

The `pairId` is the shared membership secret. Knowing it authorizes enrollment into the circle.
It is generated on-device and shared out-of-band (QR, message, etc.).

### Device identity

Each device has:
- **`deviceId`** — opaque identifier (128-bit hex), stored in `expo-secure-store`. Not a secret.
- **`deviceSecret`** — symmetric credential (256-bit hex), generated on first use, stored in `expo-secure-store`. Never derived from anything shipped in the APK.

The server learns `deviceSecret` only at enrollment. It is never transmitted again.

### Multiple devices per person

Multiple phones can be enrolled in the same circle. Each device is tracked independently.
Revoking one device does not revoke the others. The trusted-person detail screen shows all
enrolled devices with their enrollment date and revocation status.

### Revocation

Users can revoke trust for a specific device or the whole circle from the trusted-person
detail screen. Revocation is server-authoritative: a revoked device cannot open or join
sessions, and any previously confirmed session is downgraded to `unverified`.

---

## 3. Device-to-Device Trust Protocol

### Protocol overview

The protocol is server-authoritative with client-verifiable attestation:

```
Device A (initiator)                    Server                      Device B (peer)
  │                                        │                            │
  │── POST /api/trust/session ───────────→ │                            │
  │   (pairId, deviceId, nonce, proof)    │                            │
  │                                        │                            │
  │←─ sessionId, challengeNonce ─────────│                            │
  │                                        │                            │
  │                                        │←─ GET /api/trust/session/pending ─│
  │                                        │   (pairId, deviceId, nonce, proof) │
  │                                        │                            │
  │                                        │── sessions[] ─────────────→│
  │                                        │                            │
  │                                        │←─ POST /api/trust/session/{id}/join ─│
  │                                        │   (sessionId, deviceId, nonce, proof) │
  │                                        │                            │
  │←─ SessionStatus (trusted) ───────────│                            │
  │                                        │                            │
  │── GET /api/trust/session/{id} ───────→│                            │
  │   (poll until peer joins)             │                            │
  │                                        │                            │
  │←─ SessionStatus (trusted) ───────────│                            │
  │                                        │                            │
  │   verifyAttestation() locally         │      verifyAttestation() locally
```

### Proof construction

Every authenticated request carries a single-use proof:

```
proof = SHA256("handshake-trust-v1|proof|" + pairId + "|" + deviceId + "|" + sessionId + "|" + nonce + "|" + issuedAt + "|" + deviceSecret)
```

The secret is the **last** field, which makes the construction safe against SHA-256 length-extension attacks.
This is a known deviation from RFC 2104 HMAC (documented in `lib/trustCrypto.ts`); the production
replacement is asymmetric device keys (Ed25519).

### Replay protection

Threefold, enforced server-side:
1. **Single-use nonces** — each nonce is consumed on first use; a replayed nonce is rejected.
2. **Bounded timestamp skew** — proofs with `issuedAt` more than 60 seconds from server time are rejected.
3. **Short session lifetime** — sessions expire after 5 minutes (`SESSION_TTL_MS`).

### Session attestation

When a session becomes `trusted`, the server produces an attestation:

```
attestation = SHA256("handshake-trust-v1|attest|" + pairId + "|" + sessionId + "|" + initiatorDeviceId + "|" + peerDeviceId + "|" + issuedAt + "|" + expiresAt)
```

Both devices can recompute and verify this locally from the `pairId` alone. A server response
that cannot be verified locally is treated as unverified — the client never takes the server's
word for it.

### Spoofed client rejection

- A device must be **enrolled** in the circle (authorization = knowledge of `pairId`).
- A device must present a valid **proof** bound to a fresh nonce, the session ID, and a timestamp.
- A device cannot join its own session (`session_same_device`).
- A session cannot be bound twice (`session_already_bound`).
- A revoked device is rejected (`device_revoked`).

### Stale device/session handling

- Sessions expire after 5 minutes and are swept periodically.
- Devices not seen for 90 days are swept if revoked.
- A new call always produces a fresh session; trust from a previous call never leaks into a new one.

---

## 4. Call-Session Authentication Mechanism

### During a call

When Handshake detects an active call (via `TelephonyCallback.CallStateListener`):

1. **Identify local device** — `getDeviceId()` / `getDeviceSecret()` from secure storage.
2. **Establish or discover session** — the initiator opens a session; the peer discovers and joins it.
3. **Mutual authentication** — both devices prove they are enrolled in the same circle.
4. **Confirm trusted relationship** — the server reports `trusted` only when both devices have
   joined with valid proofs.
5. **Derive call state** — `deriveCallState()` maps the evidence to `trusted` / `verify` / `risk`.
6. **Show overlay** — the state is pushed to the Android overlay service.

### State derivation

The call state is derived from evidence, never from call activity alone:

| Condition | State | Overlay label |
|---|---|---|
| Risk detected by real analysis | `risk` | "Handshake · Risk detected" |
| Server confirmed + attestation verified + call active | `trusted` | "Handshake · Trusted connection" |
| Backend unreachable | `verify` | "Handshake · Verify" |
| No trusted circle | `verify` | "Handshake · Verify" |
| Device revoked | `verify` | "Handshake · Verify" |
| Session not confirmed | `verify` | "Handshake · Verify" |
| Call active, no backend response yet | `verify` | "Handshake · Phone call" |

### Offline behavior

- If the backend is unreachable, the overlay shows "Handshake · Verify" — never "Protected".
- If the backend is reachable but the peer hasn't joined, the overlay shows "Handshake · Phone call".
- The overlay never claims trust without a server-confirmed, locally-verified session.

---

## 5. Real-Time Audio Architecture

### Scope boundary

The audio pipeline operates **only** on audio that Handshake itself controls or receives:

- **Carrier calls:** `TelephonyCallback` exposes call *state*, not the audio stream. Microphone
  capture is silenced during active carrier calls. **No audio analysis is performed.**
- **Third-party apps (WhatsApp, etc.):** Their private two-way audio is not exposed to Handshake.
  **No audio analysis is performed.**
- **Handshake-controlled calls:** Where Handshake owns the audio stream (e.g., a future
  `ConnectionService` + WebRTC implementation), the full pipeline is available.

### Pipeline

```
audio frames → VAD → short buffered speech windows → streaming STT → incremental risk analysis → risk engine → state
```

Components:
1. **VAD** (`VoiceActivityDetector`) — energy-based speech detection with hangover.
2. **Speech Windower** (`SpeechWindower`) — buffers speech into bounded windows (4s target, 8s max).
3. **STT** (`TranscribeWindow`) — transcribes one short window. Incremental; retains no raw audio.
4. **Risk Engine** (`RiskEngine`) — accumulates per-window assessments into an escalating risk state.
   Later windows can only raise the score, never lower it.

### Privacy

- Raw audio is **never uploaded**. Only short-lived text transcriptions leave the device.
- Windows are bounded in duration (max 8 seconds), so the buffer cannot grow into a recording.
- Analysis stops when the source stops; `stop()` clears all buffers.
- The pipeline refuses to run over any source that does not declare itself Handshake-controlled
  (`assertControllableSource`).

### Risk signals

The local risk engine detects: urgency, pressure, financial requests, secrecy/isolation,
impersonation, suspicious instructions, coercion, and authority pressure. A score >= 70
triggers the risk state.

---

## 6. Overlay State Machine

### States

| State | Label | Color | Condition |
|---|---|---|---|
| `trusted` | "Handshake · Trusted connection" | Green | Server confirmed + attestation verified |
| `verify` | "Handshake · Verify" | Amber | Backend unreachable |
| `verify` | "Handshake · Phone call" | Gray | Call active, no backend response yet |
| `risk` | "Handshake · Risk detected" | Red | Risk engine triggered |

### Lifecycle

- **RINGING** → overlay appears with "Handshake · Phone call" (or "Handshake · Verify" if offline).
- **OFFHOOK (active)** → trust cycle runs; overlay updates to confirmed state.
- **IDLE (call ended)** → overlay removed cleanly.
- **New call** → trust resets; previous call's trust never leaks into the new one.

### Honesty rules

- The overlay **never** displays "Handshake Protected" merely because a call is active.
- The overlay **never** claims trust without a server-confirmed, locally-verified session.
- The overlay **never** claims trust when the backend is unreachable.
- The risk card's action is "Dismiss" / "Trusted people" — not a dead-end "Verify now".

---

## 7. Removed Legacy UX

The following have been removed from the product:

| Removed | Replacement |
|---|---|
| `MyCode` screen (`codes/[pairId].tsx`) | Automatic device-to-device trust |
| `CodeDisplay` component | Nothing — no code to display |
| `TrustPing` component | Nothing — no spoken verification |
| `useLiveCode` hook | Nothing — no code to poll |
| "Show my code" button | Nothing — trust is automatic |
| "Check a call" manual transcript flow | Automatic call handling |
| "Verify now" dead-end button | "Dismiss" / "Trusted people" actions |
| `handshakeOverlayAction="verify"` dead wiring | `state=trusted_people` consumed by `OverlayActionRouter` |
| "Handshake Protected" false claim | Honest "Trusted connection" / "Verify" / "Risk detected" |

The backend `/api/code/*` routes remain for backward compatibility but are no longer
part of the mobile product flow.

---

## 8. Android Platform Limitations

### What Android gives Handshake

- **Call-state detection** via `TelephonyCallback.CallStateListener` (RINGING / OFFHOOK / IDLE).
- **Overlay rendering** via `TYPE_APPLICATION_OVERLAY` windows.
- **Foreground service** for persistent call monitoring.

### What Android does NOT give Handshake

- **Carrier call audio** — `CAPTURE_AUDIO_OUTPUT` is system-only. Microphone capture is
  silenced during active carrier calls.
- **Third-party call audio** — WhatsApp and other calling apps do not expose their
  private two-way audio to Handshake.
- **Caller identity** — `TelephonyCallback` does not deliver the phone number. No
  `READ_CALL_LOG` permission is requested.

### Consequences

- The overlay shows **call state** (ringing / active / ended) and **trust state**
  (trusted / verify / risk), but never claims to have analyzed audio that Android
  does not expose.
- Real-time audio analysis is only available for Handshake-controlled calls where
  the app legitimately owns the audio stream.
- The product does not replace the system Phone app or any third-party calling app.

---

## 9. Device Test Evidence

### Previous run (2026-10-07, commit `4a29521`)

The previous device run validated the overlay lifecycle, call-state detection, and
honest overlay wording. Results: PASS 23, FAIL 3, BLOCKED 4, UNKNOWN 5.

The three failures (E1, E2, F4) have been addressed:
- **E1/E2:** The overlay no longer claims "Handshake Protected" without verification.
- **F4:** The risk card's action is now "Dismiss" / "Trusted people" — no dead-end.

### Pending re-test

A device re-test is required to validate:
- The new trust protocol end-to-end (two Handshake devices confirming each other).
- The updated overlay states (Trusted / Verify / Risk detected).
- The removed legacy UX (no MyCode, no "Check a call", no dead-end "Verify now").

---

## 10. Remaining Blockers

1. **Two-device end-to-end test** — the trust protocol has unit tests but has not been
   tested with two physical Handshake devices confirming each other during a call.
2. **Handshake-controlled audio** — no production `AudioFrameSource` implementation exists.
   The pipeline is fully implemented and tested but has no audio source to operate on.
3. **Serverless state** — the trust store is in-memory per server instance. On serverless
   hosting with multiple instances, enrollment on instance A is invisible to instance B.
   Production requires a shared, durable store.
4. **Production crypto** — the proof construction is a suffix-keyed SHA-256, not RFC 2104 HMAC.
   Production requires asymmetric device keys (Ed25519) with server-side public-key registration.
5. **Outgoing call detection** — the fake-call tool (Phony) cannot generate outgoing calls,
   so outgoing-call overlay behavior remains untested.

---

## 11. File Map

### Backend (Next.js API)

| File | Purpose |
|---|---|
| `lib/trustCrypto.ts` | Proof, attestation, and session-token primitives |
| `lib/trustStore.ts` | In-memory store for devices and sessions |
| `lib/trustSchemas.ts` | Zod schemas for trust API requests/responses |
| `app/api/trust/enroll/route.ts` | Device enrollment |
| `app/api/trust/circle/route.ts` | List devices in a circle |
| `app/api/trust/revoke/route.ts` | Revoke a device or circle |
| `app/api/trust/session/route.ts` | Open a call session |
| `app/api/trust/session/pending/route.ts` | Discover pending sessions |
| `app/api/trust/session/[sessionId]/route.ts` | Poll session status |
| `app/api/trust/session/[sessionId]/join/route.ts` | Join a session |

### Mobile (Expo / React Native)

| File | Purpose |
|---|---|
| `mobile/lib/trust/api.ts` | Trust API client |
| `mobile/lib/trust/proof.ts` | Client-side proof computation |
| `mobile/lib/trust/session.ts` | In-call trust orchestration |
| `mobile/lib/trust/orchestrator.ts` | Call detection → trust → overlay bridge |
| `mobile/lib/trust/callState.ts` | Call state derivation (pure) |
| `mobile/lib/trust/deviceIdentity.ts` | Device ID + secret management |
| `mobile/lib/audio/pipeline.ts` | Real-time audio analysis pipeline |
| `mobile/lib/callOverlay.ts` | Android overlay bridge |
| `mobile/lib/overlayIntent.ts` | Overlay launch-intent consumer |
| `mobile/lib/shield/engine.tsx` | Shield state engine (risk sink) |
| `mobile/lib/shield/capabilities.ts` | Risk analysis APIs |
| `mobile/lib/storage.ts` | SecureStore wrapper for pairs |
| `mobile/app/(tabs)/index.tsx` | Home screen |
| `mobile/app/(tabs)/trusted.tsx` | Trusted people list |
| `mobile/app/verify/[pairId].tsx` | Pre-call trust management |
| `mobile/app/trusted/[pairId].tsx` | Trusted person detail + device management |
| `mobile/components/CreatePairForm.tsx` | Add trusted person + enroll device |
| `mobile/components/ActiveShield.tsx` | In-app risk surface |
| `mobile/components/StatusRing.tsx` | Status indicator |

### Android Native

| File | Purpose |
|---|---|
| `mobile/android/.../callaudio/HandshakeOverlayService.kt` | Overlay service (call state + rendering) |
| `mobile/android/.../callaudio/HandshakeOverlayModule.kt` | RN bridge for overlay |
| `mobile/android/.../callaudio/MainActivityIntentBridge.kt` | Launch-intent action capture |
| `mobile/android/.../MainActivity.kt` | Captures overlay intent extras |

### Tests

| File | Purpose |
|---|---|
| `tests/trust.test.ts` | Trust protocol unit tests (661 lines) |
| `tests/lib.test.ts` | Library unit tests |
| `tests/api.test.ts` | API route tests |
