import {
  CreatePairResponse,
  CurrentCode,
  VerifyCodeRequest,
  VerifyCodeResponse,
  AnalysisRequest,
  AnalysisResponse,
  ChallengeRequest,
  ChallengeResponse,
  PairId,
  PairMeta,
  Verdict,
  PressureCheckResponse,
  ChallengeCategory,
  ChallengeDifficulty,
} from "./apiTypes";

const FEATHERLESS_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.100.35:3000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.100.35:3000"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as { error?: { code: string; message: string } };
    const message = error?.error?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, error?.error?.code ?? "unknown_error", message);
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  createPair: () =>
    request<CreatePairResponse>("/api/circle", {
      method: "POST",
    }),

  getCurrentCode: (pairId: string) =>
    request<{
      pairId: string;
      code: string;
      windowStart: number;
      periodSeconds: number;
      secondsRemaining: number;
    }>(`/api/code/current?pairId=${encodeURIComponent(pairId)}`),

  verifyCode: (pairId: string, code: string) =>
    request<{ verdict: "verified" | "not-verified" | "waiting"; checkedAt: string }>(
      "/api/code/verify",
      {
        method: "POST",
        body: JSON.stringify({ pairId, code }),
      },
    ),

  analyzePressure: (transcript: string, pairId?: string) =>
    request<{
      pressureScore: number;
      humanLikelihood: number;
      reasoning: string;
      verdict: "likely_human" | "likely_clone" | "uncertain";
    }>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ transcript, pairId }),
    }),

  generateChallenge: (pairId: string, context?: string) =>
    request<{
      challenge: string;
      category: "personal" | "recent" | "common_knowledge";
      difficulty: "easy" | "medium" | "hard";
    }>("/api/challenge", {
      method: "POST",
      body: JSON.stringify({ pairId, context }),
    }),
};
