/**
 * React Native boundary for the native audio-access probe (`HandshakeAudioProbe`).
 *
 * The Kotlin side (`AudioSourceProbe.kt` + `HandshakeAudioProbeModule.kt`)
 * measures stages 1–3 for each candidate source and returns raw facts. This
 * module is the only place that knows the native module name; the pure
 * adaptation into the `NativeProbeReport` model (including the stage-4
 * attribution rule) lives in `probeAdapter.ts` so it is unit-testable.
 *
 * The native module is optional (non-Android builds, older APKs), so every
 * access is defensive and a failed probe resolves to an honest "nothing usable"
 * report rather than throwing.
 */

import { NativeModules, Platform } from "react-native";
import { adaptReport, EMPTY_PROBE_REPORT, type NativeReport } from "./probeAdapter";
import type { NativeProbeReport } from "./sourceManager";

type HandshakeAudioProbeNativeModule = {
  probe?: () => Promise<unknown>;
  [key: string]: unknown;
};

/** True when this build can actually reach the native probe. */
export function isAudioProbeAvailable(): boolean {
  return (
    Platform.OS === "android" &&
    NativeModules.HandshakeAudioProbe != null &&
    typeof (NativeModules.HandshakeAudioProbe as HandshakeAudioProbeNativeModule).probe ===
      "function"
  );
}

/**
 * Runs the native probe and returns an adapted report.
 *
 * Resolves with an "empty" report (no candidates) when the probe is unavailable
 * or fails, so callers get a well-formed, honest "nothing usable" answer rather
 * than an exception.
 */
export async function runAudioProbe(): Promise<NativeProbeReport> {
  if (!isAudioProbeAvailable()) return EMPTY_PROBE_REPORT;

  const module = NativeModules.HandshakeAudioProbe as HandshakeAudioProbeNativeModule;
  try {
    const raw = (await module.probe!()) as NativeReport | null;
    if (!raw || typeof raw !== "object") return EMPTY_PROBE_REPORT;
    return adaptReport(raw);
  } catch {
    // A failed probe is not usable audio; report honestly and move on.
    return EMPTY_PROBE_REPORT;
  }
}
