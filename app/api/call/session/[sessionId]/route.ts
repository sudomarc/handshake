import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { callSessionSchema } from "@/lib/callSchemas";
import { callSessionStore } from "@/lib/callStore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const deviceId = searchParams.get("deviceId");

    if (!sessionId || !deviceId) {
      return NextResponse.json({ error: "sessionId and deviceId are required" }, { status: 400 });
    }

    const session = await callSessionStore.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Include pending ICE candidates for this device
    const iceCandidates = await callSessionStore.getIceCandidates(sessionId, deviceId);

    return NextResponse.json(
      callSessionSchema.parse({
        ...session,
        iceCandidates: iceCandidates.map((c) => ({
          candidate: c.candidate,
          sdpMid: c.sdpMid,
          sdpMLineIndex: c.sdpMLineIndex,
          fromDeviceId: "", // Not needed for client
        })),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
