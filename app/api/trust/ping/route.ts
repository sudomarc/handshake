import { NextResponse } from "next/server";

/**
 * Lightweight reachability probe for the trust backend.
 * Returns 200 OK if the server is reachable. Used by the mobile client
 * to detect offline state before attempting trust operations.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: Date.now() });
}