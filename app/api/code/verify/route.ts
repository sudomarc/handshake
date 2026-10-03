import { type NextRequest, NextResponse } from "next/server";
import { RateLimitError } from "@/lib/errors";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { verifyCodeRequestSchema, verifyCodeResponseSchema } from "@/lib/schemas";
import { verifyCode } from "@/lib/totp";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = verifyCodeRequestSchema.parse(raw);

    // 5 attempts per 30 s window per pair (SECURITY.md, T2), then locked until the window ends.
    const perPair = consume(`verify:pair:${body.pairId}`, 5, 30_000);
    if (!perPair.allowed) throw new RateLimitError(perPair.retryAfterSeconds);
    // Secondary guard against one client hammering many pairs.
    const perClient = consume(`verify:ip:${clientKey(req)}`, 30, 60_000);
    if (!perClient.allowed) throw new RateLimitError(perClient.retryAfterSeconds);

    const verdict = await verifyCode(body.pairId, body.code);
    return NextResponse.json(
      verifyCodeResponseSchema.parse({ verdict, checkedAt: new Date().toISOString() }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
