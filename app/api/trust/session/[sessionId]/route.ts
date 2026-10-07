import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import {
  getSessionQuerySchema,
  sessionStatusResponseSchema,
} from "@/lib/trustSchemas";
import { resolveSession, sessionTokenFor, trustStore } from "@/lib/trustStore";

/**
 * Reads the current state of a call session.
 *
 * Read-only by design: it can never promote a session to `trusted`. Trust is
 * only ever established by a successful `joinSession` proof, which is why a
 * revoked or unknown device can observe `unverified` here but cannot obtain a
 * trusted state.
 *
 * When the session *is* confirmed, the response also carries:
 *   - `attestation` — derived from the pair id only, so both devices can verify
 *     it locally without trusting this server's word (see lib/trustCrypto.ts);
 *   - `token` — a server-signed short-lived handle, opaque to the client.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const url = new URL(req.url);
    const query = getSessionQuerySchema.parse({
      deviceId: url.searchParams.get("deviceId") ?? undefined,
      nonce: url.searchParams.get("nonce") ?? undefined,
      issuedAt: url.searchParams.get("issuedAt") ?? undefined,
      proof: url.searchParams.get("proof") ?? undefined,
    });

    const session = trustStore.readSession({
      sessionId,
      deviceId: query.deviceId,
      nonce: query.nonce,
      issuedAt: query.issuedAt,
      proof: query.proof,
    });
    const resolved = resolveSession(session);

    return NextResponse.json({
      ...sessionStatusResponseSchema.parse(resolved),
      ...(resolved.state === "trusted" ? { token: sessionTokenFor(session) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}