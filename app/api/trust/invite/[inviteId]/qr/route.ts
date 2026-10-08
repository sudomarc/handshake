import { type NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { handleApiError } from "@/lib/http";
import { TrustError, trustStore } from "@/lib/trustStore";

/**
 * Renders the pairing deep link (`handshake://pair?invite=<inviteId>`) as a PNG
 * QR code. The QR contains ONLY the short-lived invite id — never deviceSecret,
 * never pairId, never long-lived credentials.
 *
 * The invite must still be usable (pending and not expired): an accepted or
 * confirmed invite can no longer pair anything, so it is `409 inviting_not_pending`.
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
    if (invite.state !== "pending") {
      throw new TrustError(
        "inviting_not_pending",
        "This invitation can no longer be used to pair.",
      );
    }

    const url = `handshake://pair?invite=${invite.inviteId}`;
    const png = await QRCode.toBuffer(url, { type: "png", width: 512, margin: 2 });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Length": String(png.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}