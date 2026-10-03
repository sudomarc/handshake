import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { analyzePressure } from "@/lib/llm";
import { analysisRequestSchema, analysisResponseSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = analysisRequestSchema.parse(raw);
    const result = await analyzePressure(body.transcript);
    return NextResponse.json(analysisResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
