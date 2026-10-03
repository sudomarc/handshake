import { analyzePressure as featherlessAnalyze, generateChallenge as featherlessChallenge } from "./featherless";
import type { PressureCheckResponse, ChallengeResponse } from "./schemas";

export async function analyzePressure(transcript: string): Promise<PressureCheckResponse> {
  return featherlessAnalyze(transcript);
}

export async function generateChallenge(context: string): Promise<ChallengeResponse> {
  return featherlessChallenge(context);
}