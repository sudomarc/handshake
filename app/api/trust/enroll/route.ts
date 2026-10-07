import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { consume } from "@/lib/rateLimit";
import {
  enrollDeviceRequestSchema,
  enrollDeviceResponseSchema,
  type PairId,
  type DeviceId,
} from "@/lib/trustSchemas";
import { trustStore } from "@/lib/trustStore";

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * Enrols this device into a trusted circle.
 *
 * Authorisation for enrolment is knowledge of the `pairId`, which is already the
 * shared membership secret in this architecture (SECURITY.md T5). Enrolling
 * therefore does not add a new trust assumption — it binds a concrete device
 * credential to that circle so the server can later recognise *two specific
 * devices* during a call without any spoken code.
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const body = enrollDeviceRequestSchema.parse(raw);

    const perClient = consume(`trust:enroll:ip:${clientKey(req)}`, 20, 60_000);
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
    const perPair = consume(`trust:enroll:pair:${body.pairId}`, 20, 60_000);
    if (!perPair.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many attempts for this circle. Wait a moment, then try again.",
          },
        },
        { status: 429, headers: { "Retry-After": String(perPair.retryAfterSeconds) } },
      );
    }

    const device = trustStore.enroll({
      pairId: body.pairId as PairId,
      deviceId: body.deviceId as DeviceId,
      deviceSecret: body.deviceSecret,
      label: body.label,
    });

    return NextResponse.json(
      enrollDeviceResponseSchema.parse({
        pairId: body.pairId,
        deviceId: body.deviceId,
        enrolledAt: new Date(device.enrolledAt).toISOString(),
        label: device.label,
      }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}