import { z } from "zod";

export const pairIdSchema = z.string().regex(/^[a-f0-9]{32}$/);
export type PairId = z.infer<typeof pairIdSchema>;

export const sixDigitCodeSchema = z.string().regex(/^\d{6}$/);

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

export const currentCodeResponseSchema = z.object({
  pairId: pairIdSchema,
  code: z.string().regex(/^\d{6}$/),
  windowStart: z.number().int().nonnegative(),
  periodSeconds: z.literal(30),
  secondsRemaining: z.number().int().min(1).max(30),
});
export type CurrentCode = z.infer<typeof currentCodeResponseSchema>;

export const verifyCodeRequestSchema = z.object({
  pairId: pairIdSchema,
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>;

export const verifyCodeResponseSchema = z.object({
  verdict: z.enum(["verified", "not-verified", "waiting"]),
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

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const tacticNameSchema = z.enum([
  "artificial_urgency",
  "secrecy",
  "immediate_payment",
  "authority_pressure",
  "other",
]);
export type TacticName = z.infer<typeof tacticNameSchema>;

export const tacticSchema = z.object({
  name: tacticNameSchema,
  evidence: z.string().max(280),
});
export type Tactic = z.infer<typeof tacticSchema>;

export const analysisResponseSchema = z.object({
  riskLevel: riskLevelSchema,
  tactics: z.array(tacticSchema).max(8),
  summary: z.string().max(500),
});
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

export const challengeRequestSchema = z.object({
  pairId: pairIdSchema,
  context: z.string().trim().min(1).max(2000).optional(),
});
export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

export const challengeCategorySchema = z.enum(["personal", "recent", "common_knowledge"]);
export type ChallengeCategory = z.infer<typeof challengeCategorySchema>;

export const challengeDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type ChallengeDifficulty = z.infer<typeof challengeDifficultySchema>;

export const challengeResponseSchema = z.object({
  challenge: z.string().trim().min(1).max(300),
  category: z.enum(["personal", "recent", "common_knowledge"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;

// Mirrors pressureCheckResponseSchema in the backend (lib/schemas.ts) for POST /api/analyze.
export const pressureVerdictSchema = z.enum(["likely_human", "likely_clone", "uncertain"]);
export type PressureVerdict = z.infer<typeof pressureVerdictSchema>;

export const pressureCheckResponseSchema = z.object({
  pressureScore: z.number().int().min(0).max(100),
  humanLikelihood: z.number().int().min(0).max(100),
  reasoning: z.string().max(500),
  verdict: pressureVerdictSchema,
});
export type PressureCheckResponse = z.infer<typeof pressureCheckResponseSchema>;

export const callSessionIdSchema = z.string().min(1);
export type CallSessionId = z.infer<typeof callSessionIdSchema>;

export const deviceIdSchema = z.string().min(1);
export type DeviceId = z.infer<typeof deviceIdSchema>;

export const callSessionStatusSchema = z.enum(["pending", "active", "ended"]);
export type CallSessionStatus = z.infer<typeof callSessionStatusSchema>;

export const sdpSchema = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string(),
});
export type SDP = z.infer<typeof sdpSchema>;

export const iceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
});
export type IceCandidate = z.infer<typeof iceCandidateSchema>;

export const callSessionSchema = z.object({
  sessionId: callSessionIdSchema,
  pairId: pairIdSchema,
  status: callSessionStatusSchema,
  callerDeviceId: deviceIdSchema,
  calleeDeviceId: deviceIdSchema.nullable(),
  offer: sdpSchema.nullable(),
  answer: sdpSchema.nullable(),
  iceCandidates: z.array(iceCandidateSchema),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type CallSession = z.infer<typeof callSessionSchema>;

export const createCallSessionRequestSchema = z.object({
  pairId: pairIdSchema,
  callerId: deviceIdSchema,
  callerName: z.string().optional(),
});
export type CreateCallSessionRequest = z.infer<typeof createCallSessionRequestSchema>;

export const createCallSessionResponseSchema = z.object({
  sessionId: callSessionIdSchema,
  pairId: pairIdSchema,
  status: callSessionStatusSchema,
  createdAt: z.number().int().nonnegative(),
});
export type CreateCallSessionResponse = z.infer<typeof createCallSessionResponseSchema>;

export const callOfferRequestSchema = z.object({
  sessionId: callSessionIdSchema,
  offer: sdpSchema,
  fromDeviceId: deviceIdSchema,
});
export type CallOfferRequest = z.infer<typeof callOfferRequestSchema>;

export const callAnswerRequestSchema = z.object({
  sessionId: callSessionIdSchema,
  answer: sdpSchema,
  fromDeviceId: deviceIdSchema,
});
export type CallAnswerRequest = z.infer<typeof callAnswerRequestSchema>;

export const iceCandidateRequestSchema = z.object({
  sessionId: callSessionIdSchema,
  candidate: iceCandidateSchema,
  fromDeviceId: deviceIdSchema,
});
export type IceCandidateRequest = z.infer<typeof iceCandidateRequestSchema>;

export const endCallRequestSchema = z.object({
  sessionId: callSessionIdSchema,
});
export type EndCallRequest = z.infer<typeof endCallRequestSchema>;
