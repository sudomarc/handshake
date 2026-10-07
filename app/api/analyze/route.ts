import { type NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/lib/errors";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { analyzePressure } from "@/lib/llm";
import { analysisRequestSchema, pressureCheckResponseSchema } from "@/lib/schemas";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = analysisRequestSchema.parse(raw);

    // Rate limit: 10 requests per minute per IP and per pair to control costs and prevent pairId credit bypass (SECURITY.md T6)
    const perClient = consume(`analyze:ip:${clientKey(req)}`, 10, 60_000);
    if (!perClient.allowed) throw new RateLimitError(perClient.retryAfterSeconds);

    if (body.pairId) {
      const perPair = consume(`analyze:pair:${body.pairId}`, 10, 60_000);
      if (!perPair.allowed) throw new RateLimitError(perPair.retryAfterSeconds);
    }

    const result = await analyzePressure(body.transcript);
    return NextResponse.json(pressureCheckResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
