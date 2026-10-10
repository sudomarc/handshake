# Android call-overlay QA — historical device report

**Test date:** 2026-10-07  
**Device:** Samsung SM-A175F, Android 16 / API 36  
**Application:** com.sudomarc.handshake  
**Source commit tested:** 4a2952167e083a74b5daba8c99941abe4d5a219c  
**Build artifact:** [Android QA workflow run 37664538883](https://github.com/sudomarc/handshake/actions/runs/37664538883)  
**APK SHA-256:** BBE61750A3BA341D69CAB027B292355F7471A4A1D0B7CD50145F9D7B5E55C039  
**Call simulator:** Phony 2.6 (incoming, active and ended states; outgoing calls were not supported)

This is a historical result for the exact commit and artifact above. It is not a verification report for the latest source or APK. The raw APK and UI-dump files are not kept in the repository; selected screenshots are retained under qa/out.

## Result summary

The 35-row matrix recorded **23 PASS, 3 FAIL, 4 BLOCKED and 5 UNKNOWN**.

| Area | Historical result |
| --- | --- |
| Install, launch and restart | 4 PASS |
| Permissions and overlay setup | 3 PASS, 1 BLOCKED |
| Simulated incoming call | 5 PASS |
| Simulated outgoing call | 3 BLOCKED because Phony did not support outgoing calls |
| Overlay state correctness | 1 PASS, 2 FAIL |
| Risk overlay actions | 3 PASS, 1 FAIL |
| Identity verification | 1 PASS, 4 UNKNOWN |
| Backend and AI checks | 3 PASS, 1 UNKNOWN |
| Third-party-app checks | 3 PASS |

## Findings from that artifact

- **Observed failure — false trusted wording:** during an active simulated call without completed identity verification, the overlay displayed “Handshake Protected”. The same wording appeared while offline. Evidence: [qa_C3_state.png](../qa/out/qa_C3_state.png) and [qa_E2_offline_active.png](../qa/out/qa_E2_offline_active.png).
- **Observed failure — Verify action:** tapping “Verify now” relaunched or foregrounded the app but did not navigate to a verification destination. Evidence: [qa_F4_result.png](../qa/out/qa_F4_result.png).
- **Observed behavior — text risk analysis:** benign and high-pressure text examples returned advisory results in the tested backend. Evidence: [qa_F1_result.png](../qa/out/qa_F1_result.png), [qa_F2_overlay.png](../qa/out/qa_F2_overlay.png) and [qa_F2_buttons.png](../qa/out/qa_F2_buttons.png).
- **Observed behavior — offline text analysis:** the app showed a bounded network error and preserved the submitted text for retry. Evidence: [qa_H4_offline.png](../qa/out/qa_H4_offline.png).
- **Limited third-party-app result:** opening WhatsApp while the service was active did not crash the app. This did not prove that WhatsApp call events or audio were detected. Evidence: [qa_I1_whatsapp2.png](../qa/out/qa_I1_whatsapp2.png).
- **Simulated ringing overlay:** the overlay appeared for a Phony incoming call. This is evidence for that simulated Telecom path only. Evidence: [qa_C1_ringing.png](../qa/out/qa_C1_ringing.png).

## Interpretation

These results show why the current APK must be tested directly before a demonstration. The historical failures are not marked fixed by this document. Re-run the relevant scenarios on the exact artifact being presented and update the evidence with its source commit, device and observed outcomes.

A call overlay, call-state callback or microphone permission does not prove that remote speech is accessible. Handshake does not currently receive the remote audio of ordinary carrier calls or WhatsApp, and this report makes no claim that live call-audio analysis is available.
