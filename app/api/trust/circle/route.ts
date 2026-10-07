import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import {
  circleStatusQuerySchema,
  circleStatusResponseSchema,
  type DeviceId,
  type PairId,
} from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";
import { TRUST_PROTOCOL, verifyDeviceProof } from "@/lib/trustCrypto";

/**
 * Pre-call status of a trusted circle.
 *
 * Unauthenticated callers get the enrolled/revoked flags only. Device ids are
 * opaque random values and this endpoint reveals nothing that can be used to
 * forge a proof, but it is still rate limited because it is enumerable by pair id.
 *
 * With a valid proof the response is marked `authorized`, which the client uses
 * to decide whether its own device may still act on this circle (i.e. whether it
 * was revoked).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = circleStatusQuerySchema.parse({
      deviceId: url.searchParams.get("deviceId") ?? undefined,
      nonce: url.searchParams.get("nonce") ?? undefined,
      issuedAt: url.searchParams.get("issuedAt") ?? undefined,
      proof: url.searchParams.get("proof") ?? undefined,
    });
    const pairId = url.searchParams.get("pairId") ?? "";

    let authorized = false;
    if (query.deviceId && query.nonce && query.proof !== undefined && query.issuedAt !== undefined) {
      try {
        const device = trustStore.requireActiveDevice(
          pairId as PairId,
          query.deviceId as DeviceId,
        );
        authorized = verifyDeviceProof({
          expected: query.proof,
          pairId,
          deviceId: query.deviceId,
          sessionId: TRUST_PROTOCOL,
          nonce: query.nonce,
          issuedAt: query.issuedAt,
          deviceSecret: device.deviceSecret,
        });
      } catch {
        authorized = false;
      }
    }

    const devices = trustStore.listDevices(pairId as PairId).map((device) => ({
      deviceId: device.deviceId,
      label: device.label,
      enrolledAt: new Date(device.enrolledAt).toISOString(),
      lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null,
      revokedAt: device.revokedAt ? new Date(device.revokedAt).toISOString() : null,
    }));

    return NextResponse.json(
      circleStatusResponseSchema.parse({ pairId, devices, authorized }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}