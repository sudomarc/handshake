# Demo Script

**Goal (one sentence):** show a convincing voice clone that a commercial
detector calls "human", then show it failing Handshake — while the real person
verifies in seconds.

Target length: 2–3 min live or recorded. This script assumes **the developer
solo, driving two devices**; a friend on Device A is a bonus, not a requirement.

## Roles & devices

| Role                    | Device                             | What it shows                                                             |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| "Mom" (receiver)        | **Device A** — phone, portrait     | Handshake **Verify** screen: huge code + countdown + verdict              |
| Real person (developer) | **Device B** — laptop              | Handshake **My codes** screen (reads the code aloud) + **Pressure check** |
| Scammer                 | speaker on Device A or a 2nd phone | plays the **cloned voice** scam audio                                     |

Setup: one pair created in advance (pair made 5 min before the demo in case
hosted storage is empty — creation takes seconds).

## Preflight (do 30 min before)

- [ ] Public URL opens on a **mobile network** (not just Wi-Fi), both screens
- [ ] Fresh pair created; Device A and Device B show the **same** code
- [ ] Clone audio file plays cleanly through the chosen speaker
- [ ] Detector result for the clone is recorded (video or screenshot) — J5
- [ ] Fallback video uploaded (unlisted) and link copied
- [ ] One test transcript through Pressure check works (LLM key healthy)
- [ ] Browser: no other tabs, volume up, phone on quiet

## The run (numbered)

1. **(10 s) Hook.** "This is a voice clone of me. A commercial detector says it
   sounds human. Watch what happens when it asks for money."
2. **(20 s) The scam.** Play the clone audio on speaker: _"Mom, it's me, I'm in
   trouble, I need $500 right now, don't tell anyone."_
3. **(20 s) The reflex.** Switch to Device A (Mom's phone): Handshake Verify
   screen — huge code, countdown ticking. Narrate: "Mom doesn't guess and
   doesn't transfer. She asks for the code. Only the real person — someone with
   the real person's phone — can say it."
4. **(30 s) Verify — pass.** Developer (real-person role, Device B visible)
   reads the current code from the **My codes** screen. On Device A, type the
   claimed code → **Verified** (green, big). "The clone can't say a code it
   never saw."
5. **(30 s) Verify — fail.** The clone audio resumes and is asked for the code.
   The clone cannot answer (no phone, no access). On Device A, enter a guess /
   leave blank → **Not verified** (red). "Same voice. Different verdict —
   because we verify the person, not the voice."
6. **(30 s) Pressure check.** On Device B, paste the call transcript → risk
   level + tactics (urgency, secrecy, immediate payment) appear as structured
   cards. One line: "and before you answer, this flags the manipulation."
7. **(20 s) Contrast beat.** Show the detector result (recorded): same audio →
   "human". Narrate the thesis: "Detection is an arms race. Verification isn't."
8. **(20 s) Worst case.** Tap **The first hour**: "If money already moved, here
   is the calm checklist for the next 60 minutes." (Do not read all items.)
9. **(10 s) Close.** One sentence on the trust model + "this is the whole
   product, live, on a phone."

## Fallbacks (decide per failure, keep the story intact)

| Failure                                               | Fallback                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detector flags the clone as fake, or detector is down | Use the J5 recorded detector result (if it showed "human"); if no clean "human" result exists, skip step 7 and lean on "even when detectors are uncertain, the code check is decisive" — never assert a detector result we didn't observe |
| LLM slow (>10 s) or down on the day                   | Show the J4 pre-captured Pressure check screenshot; narrate the same beat                                                                                                                                                                 |
| Code doesn't match at the rotation moment             | Wait for the next window (≤30 s) or recreate the pair (seconds) before step 4                                                                                                                                                             |
| Hosted storage empty / URL broken                     | Recreate pair; if the URL itself is down, switch entirely to the pre-recorded video and continue the live narration around it                                                                                                             |
| Anything derails > 1 min                              | Cut to step 5 (the fail) — the contrast is the story; the rest is garnish                                                                                                                                                                 |
| Total disaster                                        | Play the pre-recorded video (J5, re-cut J7) unbroken                                                                                                                                                                                      |

## After the demo

- Re-record the final video (J7) from the cleanest live run.
- Refresh README "Demo" section if the flow changed.
- Submit Devpost with: repo URL, video link, story, screenshots, public URL.
