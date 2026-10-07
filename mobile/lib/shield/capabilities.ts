import { api } from "@/lib/api";
import type { PressureCheckResponse } from "@/lib/apiTypes";

/**
 * Risk-analysis capabilities.
 *
 * The spoken/shared-code verification capabilities (`openTrustPing`,
 * `checkReply`) have been removed from the mobile product: trust is now
 * established automatically between two enrolled devices, so there is no code
 * to fetch, display, or type during a call.
 */
export type RiskVerdict = "clear" | "threat";

export interface TranscriptCheck {
  result: PressureCheckResponse;
  verdict: RiskVerdict;
}

/** Pressure Check is advisory. It detects social-engineering pressure only. */
export const THREAT_PRESSURE_SCORE = 70;

export function classifyPressure(result: PressureCheckResponse): RiskVerdict {
  return result.pressureScore >= THREAT_PRESSURE_SCORE || result.riskLevel === "high"
    ? "threat"
    : "clear";
}

/**
 * Scores a text window. Used by the in-call pipeline for windows Handshake has
 * already transcribed, and by tests. Never used as a manual user-facing tool.
 */
export async function checkTranscript(
  transcript: string,
  pairId?: string,
): Promise<TranscriptCheck> {
  const result = await api.analyzePressure(transcript, pairId);
  return { result, verdict: classifyPressure(result) };
}