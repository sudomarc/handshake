import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { generateChallenge } from "@/lib/llm";
import { challengeRequestSchema, challengeResponseSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = challengeRequestSchema.parse(raw);
    const result = await generateChallenge(body.context);
    return NextResponse.json(challengeResponseSchema.parse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
