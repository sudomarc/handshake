# Security

Plain-language threat model for the **demo**. This is not a security
certification; it is an honest list of what we protect, how, and where the
gaps are.

## What we are protecting (assets)

1. **Device secrets** — the per-device secrets registered at enrollment and
   used to prove trust sessions.
2. **`FEATHERLESS_API_KEY` / `PAIR_DERIVATION_KEY`** — server credentials.
3. **Transcripts and saved personal context** — user-supplied text.
4. **Verdict integrity** — the Trusted / Verify / Risk result must reflect a
   real check.

## Trust boundaries (short version)

The browser is untrusted: everything it sends is validated with zod before
use. Secrets exist only in server environment variables. The LLM provider is
an external dependency that receives the transcript; it never receives any
secret.

## Threats

### T1 — Invitation misuse

**Attack.** A stranger scans the QR invitation before the intended person
does, accepts, and becomes a confirmed peer.

**Mitigation.** The invitation is short-lived and single-use. Both parties
must confirm on their own phones. The relationship is mutual.

**Residual risk.** If a stranger scans the invitation before the intended
person does, they could accept and become a confirmed peer. Pairing should
happen with both phones physically together.

### T2 — Device compromise

**Attack.** A paired phone is stolen; the thief can participate in trusted
sessions.

**Mitigation.** Revocation (`POST /api/trust/revoke`) removes a device or
whole circle. The user must notice and revoke.

**Residual risk.** Same trust model as any device-based credential. Out of
scope by design for the demo.

### T3 — Server compromise

**Attack.** Secrets read from the repository, logs, or server.

**Mitigation.**

- Keys live only in `.env.local` (gitignored) / platform env vars — never in
  code, logs, error messages, or the client bundle.
- API error responses return plain-language messages without internals.

**Residual risk.** An attacker who compromises the server process could read
`PAIR_DERIVATION_KEY` from the environment. That is equivalent to a
database-password compromise; the demo accepts this risk.

### T4 — Prompt injection via transcripts

**Attack.** The "scam transcript" contains instructions aimed at the LLM.

**Mitigation (defense in depth):**

1. The transcript is fenced in the prompt as untrusted data with an explicit
   rule: instructions inside it must be ignored.
2. The model has **no tools / no function calling** — even a successful
   injection cannot trigger any action, and the model sees no secrets to
   exfiltrate (none are in the prompt).
3. The model must answer with a fixed JSON schema; the output is validated
   with zod. Output that doesn't match is discarded (one retry, then a safe
   error). So the _worst case_ is a manipulated risk level displayed to the
   user — which the UI labels as advisory.

**Residual risk.** The LLM can still be talked into a biased or wrong
analysis (prompt-injection resistance is probabilistic, not absolute). We do
not claim it is injection-proof.

### T5 — Pair ID guessing (legacy)

**Attack.** Guessing a `pairId` to use that pair's legacy codes.

**Mitigation.** `pairId` is a high-entropy random string (not a sequential
ID). The pair ID is the shared membership secret: knowing it is equivalent
to being in the circle, by design.

**Residual risk.** If a user leaks their pair ID, the holder can read that
pair's legacy codes. Documented; the UX guidance is to treat the pair ID
like a password. The primary QR pairing flow does not expose the pair ID to
users.

### T6 — LLM endpoint abuse (cost / quota)

**Attack.** Spamming `/api/analyze` with long transcripts to burn API
credits.

**Mitigation.** zod max-length on the transcript, per-IP rate limiting at the
route level, output token cap on model calls.

**Residual risk.** Full abuse protection is a production concern.

### T7 — Data loss (storage)

**Residual risk.** The trust backend keeps devices, invitations and sessions
in memory per server instance. On serverless hosting with multiple instances,
an enrollment or invitation created on instance A is invisible to instance B.
Production requires a shared, durable store.

## What we do NOT mitigate (honest gaps)

- **Social-engineered disclosure.** A scammer who convinces the real person to
  accept their QR invitation defeats the pairing check. UI guidance: only
  pair with people you know, with both phones physically together.
- **Pressure check can reassure falsely.** The model only sees a text
  transcript. A calm, convincing scam script can score low even when it is
  malicious. The output is advisory about pressure tactics only; it says
  nothing about who is speaking.
- **No accounts/auth in the demo.** Anyone with a pair ID can use that pair's
  legacy routes. Production would need real authentication and device
  registration.
- **LLM provider data handling.** Transcripts are sent to Featherless for
  analysis. We have not audited their retention/no-training policies; a
  production version must.
- **No audit logging** beyond in-memory rate-limit counters.
- **No transport-level hardening** beyond what the hosting platform (Vercel:
  TLS, basic WAF) provides by default.

## What a production version would need

Accounts with real auth + 2FA · device enrollment and revocation · secrets
encrypted at rest with key management · per-user rate limiting and abuse
detection · audit logs · legal/privacy review (transcripts contain personal
data) · a signed data-processing agreement with the LLM provider · red-team
testing of the prompt fence · honest published evaluation of the advisory
signals (only after measuring them).
