# Demo Script (Handshake Personal — mobile)

**Goal (one sentence):** show a convincing voice-clone scam scenario, then show
the real Handshake verification flow on two phones producing an observed
result.

**What the product does (and does not do):**

- Identity is proven by a **shared 6-digit code that rotates every 30 seconds**,
  derived server-side and verified server-side. The Verify screen
  **deliberately does not show the live code** — showing it on the screen where
  you type it would defeat the check.
- The **Pressure check** analyzes scam tactics in a **text transcript** (urgency,
  secrecy, payment requests, authority impersonation). It does not analyze
  audio and is not a voice-clone detector. Never claim cloned-voice detection.

**Wording rules (audit 2026-10-05):**

- Say: "Pressure check looks for manipulation tactics in a text transcript. It is
  advisory." Never say it detects a cloned voice, and never present its output as
  proof that a caller is real or fake.
- The mobile result screen currently shows a label (_Likely human_ / _Likely clone /
  scam pressure_ / _Uncertain_), a pressure score, a "human likelihood" number and a
  short reasoning (see ROADMAP finding F1). Read out the **pressure score and the
  reasoning only**; do not read the label or the "human likelihood" as a verdict
  about the voice. A calm transcript scoring low means "little pressure in this text",
  not "this person is genuine".
- _Personal question_ returns a generic question on mobile (no private context can be
  entered). Skip it, or describe it as a generic extra question — not as personalized.
- The wrong code in step 5 is typed by the presenter as role-play; the
  **Not verified** verdict itself is a real server check.

**Evidence rule:** only state a result if it was actually observed and
recorded. If a feature does not produce the expected result, do not invent or
simulate it; use the observed result and adapt the narration.

Target length: 2–3 min (ForgeHacks allows up to 4 min). This script assumes the
developer solo, driving **two Android phones** (one device + emulator works for
rehearsal; two real devices for the recording).

## Roles & devices

| Role                    | Device                             | What it shows                                                                                              |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Mom" (receiver)        | **Device A** — Android phone       | Handshake **Verify a call** screen: types the code the caller says → verdict. No live code on this screen. |
| Real person (developer) | **Device B** — Android phone       | Handshake **My code** screen (6 digits + countdown, read aloud) + **Pressure check** + **The first hour**  |
| Scammer                 | speaker on Device A or a 2nd phone | plays the **cloned voice** scam audio                                                                      |

Setup: one pair created in advance in the Trusted tab on Device A; Device B
joins the same pair (same pairId). Both devices must show the same 6 digits
before the demo.

## Preflight (do 30 min before)

- [ ] APK installed on both devices; Home renders, no red screen
- [ ] Both devices joined to the same pair and show the **same** 6 digits
- [ ] Public API URL reachable on **mobile data** (not just Wi-Fi)
- [ ] Code rotates at 30 s on both devices (wait one full window)
- [ ] One test transcript through Pressure check works (LLM key healthy)
- [ ] One test verify (good + bad code) works end-to-end
- [ ] Clone audio file plays cleanly through the chosen speaker
- [ ] Fallback video uploaded (unlisted) and link copied
- [ ] Phones: volume up, DND on, battery > 60 %, no pending updates

## The run (numbered)

1. **(10 s) Hook.** "Scammers can clone your voice. The only check that works
   is one the clone can't access: a code only the real person's phone can show."
2. **(20 s) The scam.** Play the clone audio on speaker: _"Mom, it's me, I'm in
   trouble, I need $500 right now, don't tell anyone."_
3. **(25 s) The reflex.** Device A (Mom's phone) on **Verify a call**. Narrate:
   "Mom doesn't guess and doesn't transfer. She asks the caller to say the
   code out loud. This screen shows no code — so there is nothing on screen to
   read. Only the real person's phone can produce it."
4. **(30 s) Verify — pass.** Device B on **My code**: developer reads the 6
   digits aloud as the "real person". On Device A, type the claimed code →
   **Verified** (big). "The clone can't say a code it never saw."
5. **(30 s) Verify — fail.** The clone audio resumes and is asked for the code.
   The clone cannot answer (no phone, no access). On Device A, enter a wrong
   code → **Not verified** (red). "Same voice. Different verdict — because we
   verify the person's phone, not the voice."
6. **(30 s) Pressure check.** On Device B, open **Pressure check**, paste the
   call transcript → the app shows a pressure score and a short written reasoning
   (urgency, secrecy, payment pressure, authority impersonation, if the model
   found them). Only describe what actually appears on screen. One line: "and
   before you answer, this flags the manipulation tactics in what they said — it
   is advisory, and it does not listen to the voice."
7. **(20 s, optional) Contrast beat.** Only if you have a _recorded external_
   voice-detection result: show it and narrate the thesis — "Detection is an
   arms race. Verification isn't." Frame it as an outside reference, never as a
   product feature.
8. **(20 s) Worst case.** Tap **The first hour** on Device B: "If money already
   moved, here is the calm checklist for the next 60 minutes." (Do not read all
   items.)
9. **(10 s) Close.** One sentence on the trust model + "that is the whole
   product, live, on two phones."

## Fallbacks (decide per failure, keep the story intact)

| Failure                                   | Fallback                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM slow (>10 s) or down on the day       | Show the pre-captured Pressure check screenshot; narrate the same beat, clearly as a fallback                                                |
| Code doesn't match at the rotation moment | Wait for the next window (≤30 s) or recreate the pair (seconds) before step 4                                                                |
| One device loses network mid-demo         | Show the clear network error, restore connection, show recovery — or cut to the pre-recorded video and continue the live narration around it |
| API down on the day                       | Switch entirely to the pre-recorded video; continue the live narration around it                                                             |
| Anything derails > 1 min                  | Cut to step 5 (the fail) — the contrast is the story; the rest is garnish                                                                    |
| Total disaster                            | Play the pre-recorded video unbroken                                                                                                         |

## After the demo

- Re-record the final video (2–4 min) from the cleanest live run; upload it
  online (e.g., YouTube) for the Devpost submission.
- Refresh README "Demo" section if the flow changed.
- Submit on Devpost with: repo URL, video link, story, screenshots, public URL.
