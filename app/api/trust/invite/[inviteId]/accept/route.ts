import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import {
  acceptInviteRequestSchema,
  acceptInviteResponseSchema,
  type DeviceId,
} from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * The peer's half of the QR pairing handshake.
 *
 * B scans A's on-screen QR, gets the deep-link invite id, and posts its device
 * credentials here. The server generates the circle's internal `pairId`, enrolls
 * B into it (same validation as `POST /api/trust/enroll`) and moves the invite
 * to `accepted`. The invite can never be accepted again after this succeeds.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await ctx.params;
    const raw: unknown = await req.json().catch(() => null);
    const body = acceptInviteRequestSchema.parse(raw);

    const perClient = consume(`trust:invite:accept:ip:${clientKey(req)}`, 10, 60_000);
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

    const { invite, device } = trustStore.acceptInvite({
      inviteId,
      peerDisplayName: body.displayName,
      deviceId: body.deviceId as DeviceId,
      deviceSecret: body.deviceSecret,
      label: body.label,
    });

    return NextResponse.json(
      acceptInviteResponseSchema.parse({
        inviteId: invite.inviteId,
        displayName: invite.ownerDisplayName,
        peerName: invite.peerDisplayName as string,
        state: "accepted" as const,
        pairId: invite.pairId as string,
        deviceId: body.deviceId,
        enrolledAt: new Date(device.enrolledAt).toISOString(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}