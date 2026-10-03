import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/http";
import { pairIdSchema, pairMetaSchema } from "@/lib/schemas";
import { getPair } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ pairId: string }> }) {
  try {
    const { pairId } = await params;
    const parsed = pairIdSchema.safeParse(pairId);
    if (!parsed.success) {
      return jsonError(404, {
        code: "pair_not_found",
        message: "We couldn't find that pair. Check the code and try again.",
      });
    }
    const meta = await getPair(parsed.data);
    return NextResponse.json(pairMetaSchema.parse(meta));
  } catch (error) {
    return handleApiError(error);
  }
}
