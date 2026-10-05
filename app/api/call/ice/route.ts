import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { iceCandidateSchema, callSessionSchema } from "@/lib/callSchemas";
import { callSessionStore } from "@/lib/callStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = iceCandidateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await callSessionStore.addIceCandidate(parsed.data.sessionId, parsed.data);
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(callSessionSchema.parse(session));
  } catch (error) {
    return handleApiError(error);
  }
}