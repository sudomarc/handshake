import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { createCallSessionRequestSchema, createCallSessionResponseSchema } from "@/lib/callSchemas";
import { callSessionStore } from "@/lib/callStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCallSessionRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await callSessionStore.createSession(parsed.data);
    return NextResponse.json(createCallSessionResponseSchema.parse(session), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}