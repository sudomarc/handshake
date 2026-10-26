import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError, NotImplementedError, PairNotFoundError, RateLimitError } from "./errors";
import { TrustError } from "./trustStore";

type ApiError = { code: string; message: string };

export function jsonError(status: number, error: ApiError) {
  return NextResponse.json({ error }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(400, {
      code: "invalid_input",
      message: "That input doesn't look right. Please check it and try again.",
    });
  }
  if (error instanceof RateLimitError) {
    const response = jsonError(429, {
      code: "rate_limited",
      message: `Too many tries. Wait ${error.retryAfterSeconds} seconds, then try again.`,
    });
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
    return response;
  }
  if (error instanceof ConfigError) {
    console.error("Configuration error:", error.message);
    return jsonError(503, {
      code: "not_configured",
      message: "The service isn't set up yet. Please try again later.",
    });
  }
  if (error instanceof NotImplementedError) {
    return jsonError(501, {
      code: "not_implemented",
      message: "This part is still under construction.",
    });
  }
  if (error instanceof PairNotFoundError) {
    return jsonError(404, {
      code: "pair_not_found",
      message: "We couldn't find that pair. Check the code and try again.",
    });
  }
  if (error instanceof TrustError) {
    // Trust failures are authentication/authorisation outcomes, not server bugs.
    // Each one resolves to `unverified` on the client; none may be reported as
    // a protection claim.
    const status =
      error.code === "device_revoked" || error.code === "device_not_enrolled"
        ? 403
        : error.code === "inviting_not_found"
          ? 404
          : 409;
    const message =
      error.code === "invalid_proof" || error.code === "nonce_replayed"
        ? "Handshake could not confirm this device."
        : error.message;
    return jsonError(status, { code: error.code, message });
  }
  console.error("Unhandled API error:", error);
  return jsonError(500, {
    code: "internal_error",
    message: "Something went wrong on our side. Please try again.",
  });
}
