import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { currentCodeQuerySchema, currentCodeResponseSchema } from "@/lib/schemas";
import { getCurrentCode } from "@/lib/totp";

export async function GET(req: NextRequest) {
  try {
    const query = currentCodeQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const current = await getCurrentCode(query.pairId);
    return NextResponse.json(currentCodeResponseSchema.parse(current));
  } catch (error) {
    return handleApiError(error);
  }
}
