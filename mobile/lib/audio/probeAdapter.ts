/**
 * Pure adapter from the native probe's raw payload to the `NativeProbeReport`
 * model. Kept free of any React Native import so it is unit-testable in Node.
 *
 * The single honesty rule lives in [attributeRemoteVoice]: **a microphone never
 * reports stage 4 (`containsRemoteVoice`) as `ok`.** Its audio is a local+remote
 * mixture, so however healthy stages 1–3 look, the remote party cannot be
 * isolated from it. Only a genuine telephony downlink that is granted, opened
 * and not silenced can be attributed to the remote party alone.
 *
 * The React Native boundary that calls into this lives in `nativeProbe.ts`.
 */

import type {
  AudioSourceKind,
  CandidateReport,
  NativeProbeReport,
  StageResult,
  StageStatus,
} from "./sourceManager";

export interface NativeCandidate {
  kind?: unknown;
  declared?: unknown;
  granted?: unknown;
  grantedEvidence?: unknown;
  opened?: unknown;
  silenced?: unknown;
  measuredRms?: unknown;
  error?: unknown;
}

export interface NativeReport {
  audioMode?: unknown;
  accessibilityCaptureAvailable?: unknown;
  candidates?: unknown;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stage(
  ok: boolean,
  evidence: string | null | undefined,
  failStatus: StageStatus = "denied",
): StageResult {
  return ok ? { status: "ok" } : { status: failStatus, ...(evidence ? { evidence } : {}) };
}

function isKnownKind(kind: string): kind is AudioSourceKind {
  return (
    kind === "privileged_downlink" || kind === "accessibility_mic" || kind === "ordinary_mic"
  );
}

/** Stage 4 attribution. Exported for direct testing. */
export function attributeRemoteVoice(candidate: {
  kind: string;
  granted: boolean;
  opened: boolean;
  silenced: boolean;
}): StageResult {
  if (candidate.kind !== "privileged_downlink") {
    return {
      status: "failed",
      evidence:
        "Microphone audio mixes the local user with whatever the call plays back; " +
        "the remote party cannot be isolated from it.",
    };
  }
  const ok = candidate.granted && candidate.opened && !candidate.silenced;
  return ok
    ? { status: "ok" }
    : { status: "not_attempted", evidence: "downlink capture not usable" };
}

/** Adapts one native candidate. Returns null for unknown kinds. */
export function adaptCandidate(raw: NativeCandidate): CandidateReport | null {
  const kind = asString(raw.kind, "");
  if (!isKnownKind(kind)) return null;

  const granted = asBool(raw.granted);
  const opened = asBool(raw.opened);
  const silenced = asBool(raw.silenced);
  const error = typeof raw.error === "string" ? raw.error : null;
  const grantedEvidence = typeof raw.grantedEvidence === "string" ? raw.grantedEvidence : error;

  return {
    kind,
    declared: asBool(raw.declared, true),
    granted: stage(granted, grantedEvidence),
    opened: stage(opened, error, "failed"),
    silenced,
    measuredRms: asNumber(raw.measuredRms),
    containsRemoteVoice: attributeRemoteVoice({ kind, granted, opened, silenced }),
  };
}

/** Adapts a full native report. Unknown candidates are dropped, not guessed. */
export function adaptReport(raw: NativeReport): NativeProbeReport {
  const rawCandidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  const candidates: CandidateReport[] = [];
  for (const entry of rawCandidates) {
    const adapted = adaptCandidate(entry as NativeCandidate);
    if (adapted) candidates.push(adapted);
  }
  return {
    audioMode: asString(raw.audioMode, "unknown"),
    accessibilityCaptureAvailable: asBool(raw.accessibilityCaptureAvailable),
    candidates,
  };
}

/** The well-formed "nothing usable" report, used when the probe is unavailable. */
export const EMPTY_PROBE_REPORT: NativeProbeReport = Object.freeze({
  audioMode: "unavailable",
  accessibilityCaptureAvailable: false,
  candidates: [],
}) as unknown as NativeProbeReport;
