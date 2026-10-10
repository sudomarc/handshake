# Demo Script (Handshake Personal — mobile)

**Goal:** show a convincing voice-clone scam scenario, then show the real
Handshake verification flow on two phones producing an observed result.

**What the product does (and does not do):**

- Identity is proven by **QR pairing** — two phones are physically together,
  one shows a QR code, the other scans it, both confirm, and the relationship
  is mutual. During a call, Handshake recognizes the paired device through a
  server-confirmed, locally-verified call session.
- The **Pressure check** analyzes scam tactics in a **text transcript**
  (urgency, secrecy, payment requests, authority impersonation). It does not
  analyze audio and is not a voice-clone detector.
- The overlay shows **Trusted connection**, **Verify**, or **Risk detected** —
  never "Protected" without evidence.

**Wording rules:**

- Say: "Pressure check looks for manipulation tactics in a text transcript. It
  is advisory." Never say it detects a cloned voice, and never present its
  output as proof that a caller is real or fake.
- The mobile result shows a **pressure score**, **risk level** and short
  reasoning. Read those as an advisory assessment of the text only. A low
  score means "little pressure in this text", not "this person is genuine".
- *Personal question* uses a private verification detail saved for the trusted
  person. Do not expose that private detail in the demo.
- Only state a result if it was actually observed and recorded. If a feature
  does not produce the expected result, do not invent or simulate it; use the
  observed result and adapt the narration.

Target length: 2–4 min (ForgeHacks allows up to 4 min). This script assumes
the developer solo, driving **two Android phones** (one device + emulator
works for rehearsal; two real devices for the recording).

## Roles & devices

| Role                    | Device                             | What it shows                                                             |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| "Mom" (receiver)        | **Device A** — Android phone       | Handshake home: Trusted people, call recognition states                   |
| Real person (developer) | **Device B** — Android phone       | Handshake home: QR invite, Pressure check, The first hour                 |
| Scammer                 | speaker on Device A or a 2nd phone | plays the **cloned voice** scam audio                                     |

Setup: one pair created in advance in the Trusted tab on Device A; Device B
joins the same pair. Both devices must show **Trusted connection** during a
call from the paired device.

## Preflight (do 30 min before)

- [ ] APK installed on both devices; Home renders, no red screen
- [ ] Both devices joined to the same pair (QR pairing complete)
- [ ] Public API URL reachable on **mobile data** (not just Wi-Fi)
- [ ] One test transcript through Pressure check works (LLM key healthy)
- [ ] Clone audio file plays cleanly through the chosen speaker
- [ ] Fallback video uploaded (unlisted) and link copied
- [ ] Phones: volume up, DND on, battery > 60 %, no pending updates

## The run (numbered)

1. **(10 s) Hook.** "Scammers can clone your voice. The only check that works
   is one the clone can't access: a phone you paired and confirmed in person."
2. **(20 s) The scam.** Play the clone audio on speaker: _"Mom, it's me, I'm
   in trouble, I need $500 right now, don't tell anyone."_
3. **(25 s) The pairing.** Device B: "Add a trusted person" → "Show my QR".
   Device A: "Scan a QR". Both confirm. Narrate: "Pairing happens once, with
   both phones together. The invitation is short-lived and single-use."
4. **(30 s) The recognition.** Device B calls Device A (or vice versa). On
   Device A, Handshake shows **Trusted connection** automatically during the
   call. "The clone can't produce a phone that was paired and confirmed."
5. **(30 s) The contrast.** The clone audio resumes. On Device A, the overlay
   shows **Verify** (unpaired or offline). "Same voice. Different verdict —
   because we verify the person's phone, not the voice."
6. **(30 s) Pressure check.** On Device B, open **Pressure check**, paste
   the call transcript → the app shows a pressure score and a short written
   reasoning. Only describe what actually appears on screen. One line: "and
   before you answer, this flags the manipulation tactics in what they said —
   it is advisory, and it does not listen to the voice."
7. **(20 s, optional) Contrast beat.** Only if you have a *recorded external*
   voice-detection result: show it and narrate the thesis — "Detection is an
   arms race. Verification isn't." Frame it as an outside reference, never as a
   product feature.
8. **(20 s) Worst case.** Tap **The first hour** on Device B: "If money
   already moved, here is the calm checklist for the next 60 minutes."
9. **(10 s) Close.** One sentence on the trust model + "that is the whole
   product, live, on two phones."

## Fallbacks (decide per failure, keep the story intact)

| Failure                                               |Fallback                                                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM slow (>10 s) or down on the day                   | Show the pre-captured Pressure check screenshot; narrate the same beat, clearly as a fallback                                                                               |
| One device loses network mid-demo                     | Show the clear network error, restore connection, show recovery — or cut to the pre-recorded video and continue the live narration around it                               |
| API down on the day                                   | Switch entirely to the pre-recorded video; continue the live narration around it                                                                                           |
| Anything derails > 1 min                              | Cut to step 5 (the Verify contrast) — the contrast is the story; the rest is garnish                                                                                       |
| Total disaster                                        | Play the pre-recorded video unbroken                                                                                                                                       |

## After the demo

- Re-record the final video (2–4 min) from the cleanest live run; upload it
  online (e.g., YouTube) for the Devpost submission.
- Submit on Devpost with: repo URL, video link, story, screenshots, public URL.

## Call companion note

For ordinary operator calls, Handshake can show its warning overlay when
call-state awareness is available. For WhatsApp and similar calling apps, the
app does not claim automatic access to their private call audio. The overlay is
a companion surface, not a replacement for the Phone or calling app.
