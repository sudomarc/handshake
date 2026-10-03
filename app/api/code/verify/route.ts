import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { verifyCodeRequestSchema, verifyCodeResponseSchema } from "@/lib/schemas";
import { verifyCode } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = verifyCodeRequestSchema.parse(raw);
    const verdict = await verifyCode(body.pairId, body.code);
    return NextResponse.json(
      verifyCodeResponseSchema.parse({ verdict, checkedAt: new Date().toISOString() }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
