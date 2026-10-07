import { api } from "../api";
import type { ChallengeResponse, PressureCheckResponse, Verdict } from "../apiTypes";

/**
 * Programmatic verification capabilities. The shield state engine triggers these;
 * no screen exposes them as a standalone tool.
 */

export type RiskVerdict = "clear" | "threat";

export interface TranscriptCheck {
  result: PressureCheckResponse;
  verdict: RiskVerdict;
}

/**
 * Pressure Check is advisory. It detects social-engineering pressure, not voice identity.
 */
export const THREAT_PRESSURE_SCORE = 70;

export function classifyPressure(result: PressureCheckResponse): RiskVerdict {
  return result.pressureScore >= THREAT_PRESSURE_SCORE || result.riskLevel === "high"
    ? "threat"
    : "clear";
}

export async function checkTranscript(
  transcript: string,
  pairId?: string,
): Promise<TranscriptCheck> {
  const result = await api.analyzePressure(transcript, pairId);
  return { result, verdict: classifyPressure(result) };
}

export async function createPersonalQuestion(
  pairId: string,
  context?: string,
): Promise<ChallengeResponse> {
  return api.generateChallenge(pairId, context);
}

export async function openTrustPing(pairId: string): Promise<void> {
  await api.getCurrentCode(pairId);
}

export async function checkReply(pairId: string, reply: string): Promise<Verdict> {
  const res = await api.verifyCode(pairId, reply);
  return res.verdict;
}
