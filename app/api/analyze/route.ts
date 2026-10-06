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

    // Rate limit: 10 requests per minute per IP and per pair to prevent cost abuse
    const ipRl = consume(`analyze:ip:${clientKey(req)}`, 10, 60_000);
    if (!ipRl.allowed) throw new RateLimitError(ipRl.retryAfterSeconds);

    if (body.pairId) {
      const pairRl = consume(`analyze:pair:${body.pairId}`, 10, 60_000);
      if (!pairRl.allowed) throw new RateLimitError(pairRl.retryAfterSeconds);
    }

    const result = await analyzePressure(body.transcript);
    return NextResponse.json(pressureCheckResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
