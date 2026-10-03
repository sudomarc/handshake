import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotImplementedError, PairNotFoundError } from "./errors";

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
  console.error("Unhandled API error:", error);
  return jsonError(500, {
    code: "internal_error",
    message: "Something went wrong on our side. Please try again.",
  });
}
