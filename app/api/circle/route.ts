import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { createPairResponseSchema } from "@/lib/schemas";
import { createPair } from "@/lib/store";

export async function POST() {
  try {
    const pair = await createPair();
    return NextResponse.json(createPairResponseSchema.parse(pair), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
