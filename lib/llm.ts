import { NotImplementedError } from "./errors";
import type { AnalysisResponse, ChallengeResponse } from "./schemas";

export async function analyzePressure(transcript: string): Promise<AnalysisResponse> {
  throw new NotImplementedError(`analyzePressure(${transcript.length} chars)`);
}

export async function generateChallenge(context: string): Promise<ChallengeResponse> {
  throw new NotImplementedError(`generateChallenge(${context.length} chars)`);
}
