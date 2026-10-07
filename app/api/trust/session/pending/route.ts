import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { getSessionQuerySchema, type PairId, type DeviceId } from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";
import { TRUST_PROTOCOL, verifyDeviceProof } from "@/lib/trustCrypto";

/**
 * Discovery step for the *receiving* device.
 *
 * A peer cannot be pushed a session, so it polls this endpoint for an open
 * session on its own circle. The caller must still prove it is an active enrolled
 * device of that circle, otherwise it cannot see — or join — anything.
 *
 * A session opened by the caller itself is never returned, so a lone device can
 * never discover its own session and mistake it for a peer.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId") ?? "";
    const query = getSessionQuerySchema.parse({
      deviceId: url.searchParams.get("deviceId") ?? undefined,
      nonce: url.searchParams.get("nonce") ?? undefined,
      issuedAt: url.searchParams.get("issuedAt") ?? undefined,
      proof: url.searchParams.get("proof") ?? undefined,
    });

    // Authorise before revealing anything.
    const device = trustStore.requireActiveDevice(pairId as PairId, query.deviceId as DeviceId);
    const authenticated = verifyDeviceProof({
      expected: query.proof,
      pairId,
      deviceId: query.deviceId,
      sessionId: TRUST_PROTOCOL,
      nonce: query.nonce,
      issuedAt: query.issuedAt,
      deviceSecret: device.deviceSecret,
    });
    if (!authenticated) {
      return NextResponse.json(
        { error: { code: "invalid_proof", message: "This device could not be authenticated." } },
        { status: 401 },
      );
    }

    const pending = trustStore
      .listSessions({ pairId: pairId as PairId, excludeDeviceId: query.deviceId as DeviceId })
      .filter((session) => session.state === "unverified" && session.peerDeviceId === null)
      .map((session) => ({
        sessionId: session.sessionId,
        pairId: session.pairId,
        challengeNonce: session.challengeNonce,
        openedByDeviceId: session.initiatorDeviceId,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
      }));

    return NextResponse.json({ sessions: pending });
  } catch (error) {
    return handleApiError(error);
  }
}