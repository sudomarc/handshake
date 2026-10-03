import { z } from "zod";

export const pairIdSchema = z.string().regex(/^[a-f0-9]{32}$/, "A pair code is 32 hex characters");
export type PairId = z.infer<typeof pairIdSchema>;

export const sixDigitCodeSchema = z.string().regex(/^\d{6}$/, "The code is 6 digits");

export const verdictSchema = z.enum(["verified", "not-verified", "waiting"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const createPairResponseSchema = z.object({
  pairId: pairIdSchema,
  createdAt: z.string().datetime(),
});
export type CreatePairResponse = z.infer<typeof createPairResponseSchema>;

export const pairMetaSchema = z.object({
  pairId: pairIdSchema,
  createdAt: z.string().datetime(),
});
export type PairMeta = z.infer<typeof pairMetaSchema>;

export const currentCodeQuerySchema = z.object({ pairId: pairIdSchema });
export type CurrentCodeQuery = z.infer<typeof currentCodeQuerySchema>;

export const currentCodeResponseSchema = z.object({
  pairId: pairIdSchema,
  code: sixDigitCodeSchema,
  windowStart: z.number().int().nonnegative(),
  periodSeconds: z.literal(30),
  secondsRemaining: z.number().int().min(1).max(30),
});
export type CurrentCode = z.infer<typeof currentCodeResponseSchema>;

export const verifyCodeRequestSchema = z.object({
  pairId: pairIdSchema,
  code: sixDigitCodeSchema,
});
export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>;

export const verifyCodeResponseSchema = z.object({
  verdict: verdictSchema,
  checkedAt: z.string().datetime(),
});
export type VerifyCodeResponse = z.infer<typeof verifyCodeResponseSchema>;

export const MAX_TRANSCRIPT_LENGTH = 4000;
export const MAX_CHALLENGE_CONTEXT_LENGTH = 2000;

export const analysisRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(MAX_TRANSCRIPT_LENGTH),
  pairId: pairIdSchema.optional(),
});
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

// J4: Pressure Check response (Featherless output)
export const verdictSchemaJ4 = z.enum(["likely_human", "likely_clone", "uncertain"]);
export type VerdictJ4 = z.infer<typeof verdictSchemaJ4>;

export const pressureCheckResponseSchema = z.object({
  pressureScore: z.number().int().min(0).max(100),
  humanLikelihood: z.number().int().min(0).max(100),
  reasoning: z.string().max(500),
  verdict: verdictSchemaJ4,
});
export type PressureCheckResponse = z.infer<typeof pressureCheckResponseSchema>;

// J4: Challenge request/response (Featherless output)
export const challengeRequestSchema = z.object({
  pairId: pairIdSchema,
  context: z.string().trim().min(1).max(MAX_CHALLENGE_CONTEXT_LENGTH).optional(),
});
export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

export const challengeCategorySchema = z.enum(["personal", "recent", "common_knowledge"]);
export type ChallengeCategory = z.infer<typeof challengeCategorySchema>;

export const challengeDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type ChallengeDifficulty = z.infer<typeof challengeDifficultySchema>;

export const challengeResponseSchema = z.object({
  challenge: z.string().trim().min(1).max(300),
  category: challengeCategorySchema,
  difficulty: challengeDifficultySchema,
});
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
