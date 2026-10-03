import { type NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/lib/errors";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { generateChallenge } from "@/lib/llm";
import { challengeRequestSchema, challengeResponseSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = challengeRequestSchema.parse(raw);

    // Rate limit: 10 requests per minute per pair
    const rl = consume(`challenge:pair:${body.pairId}`, 10, 60_000);
    if (!rl.allowed) throw new RateLimitError(rl.retryAfterSeconds);

    const result = await generateChallenge(body.context ?? "");
    return NextResponse.json(challengeResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
