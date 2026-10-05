import { z } from "zod";

// Call session schemas
export const createCallSessionRequestSchema = z.object({
  pairId: z.string().length(32),
  callerId: z.string().length(32), // device identifier
  callerName: z.string().optional(),
});

export const createCallSessionResponseSchema = z.object({
  sessionId: z.string(),
  pairId: z.string(),
  status: z.enum(["pending", "active", "ended"]),
  createdAt: z.number(),
});

export const callOfferSchema = z.object({
  sessionId: z.string(),
  offer: z.object({
    type: z.literal("offer"),
    sdp: z.string(),
  }),
  fromDeviceId: z.string(),
});

export const callAnswerSchema = z.object({
  sessionId: z.string(),
  answer: z.object({
    type: z.literal("answer"),
    sdp: z.string(),
  }),
  fromDeviceId: z.string(),
});

export const iceCandidateSchema = z.object({
  sessionId: z.string(),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable(),
    sdpMLineIndex: z.number().nullable(),
  }),
  fromDeviceId: z.string(),
});

export const callSessionSchema = z.object({
  sessionId: z.string(),
  pairId: z.string(),
  status: z.enum(["pending", "active", "ended"]),
  callerDeviceId: z.string(),
  calleeDeviceId: z.string().nullable(),
  offer: z.object({
    type: z.literal("offer"),
    sdp: z.string(),
  }).nullable(),
  answer: z.object({
    type: z.literal("answer"),
    sdp: z.string(),
  }).nullable(),
  iceCandidates: z.array(z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable(),
    sdpMLineIndex: z.number().nullable(),
    fromDeviceId: z.string(),
  })),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type CreateCallSessionRequest = z.infer<typeof createCallSessionRequestSchema>;
export type CreateCallSessionResponse = z.infer<typeof createCallSessionResponseSchema>;
export type CallOffer = z.infer<typeof callOfferSchema>;
export type CallAnswer = z.infer<typeof callAnswerSchema>;
export type IceCandidate = z.infer<typeof iceCandidateSchema>;
export type CallSession = z.infer<typeof callSessionSchema>;