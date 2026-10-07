import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import {
  openSessionRequestSchema,
  openSessionResponseSchema,
} from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * Opens a short-lived call session for this circle.
 *
 * This is the first half of the in-call mutual authentication:
 *
 *   CALL START
 *     → POST /api/trust/session        (device A proves it is enrolled)
 *     → GET  /api/trust/session/pending (device B discovers A's session)
 *     → POST /api/trust/session/{id}/join (device B proves it is enrolled)
 *     → GET  /api/trust/session/{id}     (device A polls until bound)
 *     → trusted | unverified
 *
 * No spoken code, no manual entry, no `MyCode` screen is involved at any step.
 * A session that is never joined expires on its own and stays `unverified`.
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = openSessionRequestSchema.parse(raw);

    const perClient = consume(`trust:session:ip:${clientKey(req)}`, 30, 60_000);
    if (!perClient.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many attempts. Wait a moment, then try again.",
          },
        },
        { status: 429, headers: { "Retry-After": String(perClient.retryAfterSeconds) } },
      );
    }

    const session = trustStore.openSession(body);

    return NextResponse.json(
      openSessionResponseSchema.parse({
        sessionId: session.sessionId,
        pairId: session.pairId,
        challengeNonce: session.challengeNonce,
        openedByDeviceId: session.initiatorDeviceId,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        status: "awaiting-peer",
      }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}