import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { joinSessionRequestSchema, joinSessionResponseSchema } from "@/lib/trustSchemas";
import { resolveSession, sessionTokenFor, trustStore } from "@/lib/trustStore";

/**
 * Second half of the in-call mutual authentication.
 *
 * A successful call here is the *only* way a session becomes `trusted`. The
 * joining device must be enrolled, not revoked, different from the initiator,
 * and must present a proof bound to this session id and its server-issued nonce.
 * Anything else leaves the session `unverified`, which the client renders as
 * "Verify", never as a protection claim.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const raw: unknown = await req.json().catch(() => null);
    const body = joinSessionRequestSchema.parse(raw);

    const session = trustStore.joinSession({ ...body, sessionId });
    const resolved = resolveSession(session);

    return NextResponse.json({
      ...joinSessionResponseSchema.parse({
        sessionId: resolved.sessionId,
        pairId: resolved.pairId,
        state: resolved.state,
        peerDeviceId: resolved.initiatorDeviceId,
        attestation: resolved.attestation,
        issuedAt: resolved.issuedAt,
        expiresAt: resolved.expiresAt,
      }),
      token: sessionTokenFor(session),
    });
  } catch (error) {
    return handleApiError(error);
  }
}