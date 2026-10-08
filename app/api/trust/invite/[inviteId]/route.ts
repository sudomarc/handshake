import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { getInviteResponseSchema } from "@/lib/trustSchemas";
import { TrustError, trustStore } from "@/lib/trustStore";

/**
 * Reads a pairing invitation by its short-lived id.
 *
 * No authentication beyond knowledge of the invite id: it is a single-use
 * capability that expires quickly, so possession of the id is the authorisation.
 * An expired invite is reported with `409 inviting_expired` (its state is also
 * flipped to `expired` in the store); an unknown id returns `404`.
 *
 * `pairId` is only revealed once the peer has accepted, so the owner can confirm.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await ctx.params;
    const invite = trustStore.getInvite(inviteId);
    if (!invite) {
      throw new TrustError("inviting_not_found", "This invitation does not exist.");
    }
    if (invite.state === "expired") {
      throw new TrustError("inviting_expired", "This invitation has expired.");
    }

    return NextResponse.json(
      getInviteResponseSchema.parse({
        inviteId: invite.inviteId,
        displayName: invite.ownerDisplayName,
        peerName: invite.peerDisplayName,
        state: invite.state,
        createdAt: new Date(invite.createdAt).toISOString(),
        expiresAt: new Date(invite.expiresAt).toISOString(),
        ...(invite.pairId !== null ? { pairId: invite.pairId } : {}),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}