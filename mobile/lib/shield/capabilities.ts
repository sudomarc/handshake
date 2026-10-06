import { api } from "@/lib/api";
import type { ChallengeResponse, PressureCheckResponse, Verdict } from "@/lib/apiTypes";

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
 * A high pressure score is the primary escalation signal. A clone verdict alone
 * is not enough: voice-authenticity uncertainty is not the same thing as scam risk.
 */
export const THREAT_PRESSURE_SCORE = 70;
export const CLONE_ESCALATION_PRESSURE_SCORE = 50;
export const MAX_HUMAN_LIKELIHOOD_FOR_CLONE_ESCALATION = 30;

export function classifyPressure(result: PressureCheckResponse): RiskVerdict {
  const highPressure = result.pressureScore >= THREAT_PRESSURE_SCORE;
  const corroboratedCloneRisk =
    result.verdict === "likely_clone" &&
    result.pressureScore >= CLONE_ESCALATION_PRESSURE_SCORE &&
    result.humanLikelihood <= MAX_HUMAN_LIKELIHOOD_FOR_CLONE_ESCALATION;

  return highPressure || corroboratedCloneRisk ? "threat" : "clear";
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
