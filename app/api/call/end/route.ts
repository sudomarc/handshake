import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { callSessionSchema } from "@/lib/callSchemas";
import { callSessionStore } from "@/lib/callStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await callSessionStore.endSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(callSessionSchema.parse(session));
  } catch (error) {
    return handleApiError(error);
  }
}
