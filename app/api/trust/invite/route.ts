import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { createInviteRequestSchema, createInviteResponseSchema } from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * Creates a one-time QR pairing invitation.
 *
 * This replaces copy/paste of the 32-char `pairId`: the peer scans a short-lived
 * deep link (`handshake://pair?invite=<inviteId>`) and both devices confirm
 * before the circle is established. The `pairId` stays an internal
 * server-generated relation id — it is never shown to users. The invite id is a
 * single-use capability that expires after `INVITE_TTL_MS` (120 s).
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = createInviteRequestSchema.parse(raw);

    const perClient = consume(`trust:invite:ip:${clientKey(req)}`, 10, 60_000);
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

    const invite = trustStore.createInvite({ ownerDisplayName: body.displayName });
    const url = `handshake://pair?invite=${invite.inviteId}`;

    return NextResponse.json(
      createInviteResponseSchema.parse({
        inviteId: invite.inviteId,
        displayName: invite.ownerDisplayName,
        expiresAt: new Date(invite.expiresAt).toISOString(),
        url,
      }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}