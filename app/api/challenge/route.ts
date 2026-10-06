import { type NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/lib/errors";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { generateChallenge } from "@/lib/llm";
import { challengeRequestSchema, challengeResponseSchema } from "@/lib/schemas";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = challengeRequestSchema.parse(raw);

    // Rate limit: 10 requests per minute per pair and per client IP (SECURITY.md, T6)
    const perPair = consume(`challenge:pair:${body.pairId}`, 10, 60_000);
    if (!perPair.allowed) throw new RateLimitError(perPair.retryAfterSeconds);
    const perClient = consume(`challenge:ip:${clientKey(req)}`, 10, 60_000);
    if (!perClient.allowed) throw new RateLimitError(perClient.retryAfterSeconds);

    const result = await generateChallenge(body.context ?? "");
    return NextResponse.json(challengeResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
