import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import { revokeDeviceRequestSchema, revokeDeviceResponseSchema } from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * Revokes a device (or a whole circle) from the trusted relationship.
 *
 * The acting device must present a valid proof, so a revoked or unknown device
 * cannot revoke others. Revocation immediately downgrades any confirmed session
 * for that circle back to `unverified`.
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = revokeDeviceRequestSchema.parse(raw);

    const perClient = consume(`trust:revoke:ip:${clientKey(req)}`, 20, 60_000);
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

    const revokedDeviceIds = trustStore.revoke({
      pairId: body.pairId,
      actor: {
        deviceId: body.actorDeviceId,
        nonce: body.actorNonce,
        issuedAt: body.actorIssuedAt,
        proof: body.actorProof,
      },
      targetDeviceId: body.targetDeviceId,
      revokeWholeCircle: body.revokeWholeCircle ?? false,
    });

    return NextResponse.json(
      revokeDeviceResponseSchema.parse({
        pairId: body.pairId,
        revokedDeviceIds,
        revokedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}