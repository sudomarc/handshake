import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import {
  confirmInviteRequestSchema,
  confirmInviteResponseSchema,
  type DeviceId,
  type PairId,
} from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * The owner's half of the QR pairing handshake.
 *
 * A sees that the peer accepted (GET /api/trust/invite/{id} shows `pairId`),
 * then confirms with the exact `pairId` the server generated at accept time.
 * Enrolls the owner device and moves the invite to its terminal `confirmed`
 * state. A wrong `pairId` is rejected with `409 inviting_pair_mismatch`; an
 * invite is confirmed at most once, ever.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await ctx.params;
    const raw: unknown = await req.json().catch(() => null);
    const body = confirmInviteRequestSchema.parse(raw);

    const perClient = consume(`trust:invite:confirm:ip:${clientKey(req)}`, 10, 60_000);
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

    const invite = trustStore.confirmInvite({
      inviteId,
      pairId: body.pairId as PairId,
      deviceId: body.deviceId as DeviceId,
      deviceSecret: body.deviceSecret,
      label: body.label,
    });

    return NextResponse.json(
      confirmInviteResponseSchema.parse({
        state: "confirmed" as const,
        pairId: invite.pairId as string,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}