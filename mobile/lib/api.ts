import { z } from "zod";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";
import {
  challengeResponseSchema,
  createPairResponseSchema,
  currentCodeResponseSchema,
  pressureCheckResponseSchema,
  verifyCodeResponseSchema,
  type ChallengeResponse,
  type CreatePairResponse,
  type CurrentCode,
  type PressureCheckResponse,
  type VerifyCodeResponse,
} from "./apiTypes";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "not_configured", "The server address is not configured in this build.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new ApiError(
      0,
      aborted ? "timeout" : "network",
      aborted ? "The server took too long to answer." : "No connection to the server.",
    );
  } finally {
    clearTimeout(timer);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ code: z.string(), message: z.string() }) })
      .safeParse(data);
    const retryHeader = Number(response.headers.get("retry-after"));
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "http_error",
      parsed.success ? parsed.data.error.message : `Request failed (${response.status}).`,
      Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined,
    );
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(response.status, "bad_response", "The server sent an unexpected answer.");
  }
  return result.data;
}

export const api = {
  createPair: (): Promise<CreatePairResponse> =>
    request("/api/circle", createPairResponseSchema, { method: "POST" }),

  getCurrentCode: (pairId: string): Promise<CurrentCode> =>
    request(`/api/code/current?pairId=${encodeURIComponent(pairId)}`, currentCodeResponseSchema),

  verifyCode: (pairId: string, code: string): Promise<VerifyCodeResponse> =>
    request("/api/code/verify", verifyCodeResponseSchema, {
      method: "POST",
      body: { pairId, code },
    }),

  analyzePressure: (transcript: string, pairId?: string): Promise<PressureCheckResponse> =>
    request("/api/analyze", pressureCheckResponseSchema, {
      method: "POST",
      body: { transcript, pairId },
    }),

  generateChallenge: (pairId: string, context?: string): Promise<ChallengeResponse> =>
    request("/api/challenge", challengeResponseSchema, {
      method: "POST",
      body: { pairId, context },
    }),
};
