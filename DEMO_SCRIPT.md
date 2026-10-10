# Demo outline — Handshake Personal

**Target duration:** 2–3 minutes. ForgeHacks' stated maximum is 4 minutes.  
**Important:** This is a script outline, not proof that a live feature works. Follow the preflight and narrate only results observed on the exact APK used in the recording.

## 1. Problem and approach (0:00–0:25)

Explain the scenario: a scammer can imitate a familiar voice, so voice familiarity alone is not proof of identity.

Say: “Handshake is designed to establish trust between devices paired in person. It does not try to decide whether a voice sounds real.”

## 2. Pairing by QR (0:25–1:10)

On two phones, if both are available and the final APK passes the preflight:

1. On Phone A, create a trusted-person invitation and display its QR code.
2. On Phone B, scan the QR code, enter a display name and accept.
3. On Phone A, confirm the relationship.
4. Show the resulting trusted-person state on both phones.

Only state that pairing succeeded if both phones actually show the completed relationship and the backend requests succeed. If the two-device test has not passed on the final APK, skip this as a claimed live success and disclose that it remains unverified.

## 3. Explain call-state honesty (1:10–1:35)

Show the current Android overlay settings/status if available. Explain that the overlay reports supported call and trust events; it does not prove caller identity merely because it is visible.

Do not claim that every WhatsApp call triggers the popup. Do not claim that the audio is being captured or analysed.

## 4. Pressure Check on supplied text (1:35–2:15)

Paste a clearly labelled example transcript, such as: “I need the money immediately. Don't tell anyone. Send it now.”

Run Pressure Check and show the actual returned score, risk level and explanation. Describe the result as an advisory assessment of pressure tactics in the text, not a verdict that the voice is cloned or that the caller is a scammer.

If the backend is unreachable or the model returns an error, show the real error and explain that the check could not complete; do not replace it with a fabricated result.

## 5. State the limits (2:15–2:35)

Close with the distinction that matters:

- QR pairing and backend-confirmed device trust are the intended identity mechanism.
- Pressure Check analyses user-supplied text.
- The current Android prototype does not access the remote voice of ordinary carrier or WhatsApp calls.
- WhatsApp popup detection is best-effort and is not guaranteed in the current `main` release.

## Preflight checklist

- [ ] Install the APK built from the final `main` commit.
- [ ] Cold-launch it and check for crashes.
- [ ] Confirm backend reachability.
- [ ] Test QR invite → scan → accept → confirm with two physical devices if available.
- [ ] Verify the overlay permissions and record the actual result of a simulated incoming call.
- [ ] Run Pressure Check on a known text example and verify its actual response.
- [ ] Record the APK workflow URL, commit SHA and any failures.
- [ ] Do not describe a skipped or blocked test as passed.

A prerecorded voice or screenshot can illustrate the problem, but it must not be described as proof that Handshake analysed a live conversation.
