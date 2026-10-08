/**
 * Extracts the invite id from a scanned/linked pairing URL.
 *
 * Accepts both forms the product renders or shares:
 *   handshake://pair?invite=<id>
 *   https://<host>/pair?invite=<id>
 *
 * The invite id is opaque to the client: there is deliberately no format check
 * beyond "non-empty", because the backend owns its id scheme.
 */
export function parsePairInvite(url: string | null | undefined): string | null {
  if (!url) return null;
  const candidate = String(url).trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const isPairRoute =
      parsed.hostname === "pair" || parsed.pathname.replace(/\/+$/, "") === "/pair";
    if (!isPairRoute) return null;
    const invite = parsed.searchParams.get("invite")?.trim();
    return invite ? invite : null;
  } catch {
    // Not a parseable URL (e.g. a bare "pair?invite=..." in automation). Fall
    // back to a tolerant scan so emulator/deep-link testing keeps working.
    const match = candidate.match(/\/pair[?&#]+(?:[^&#]*&)*invite=([^&#\s]+)/i);
    return match?.[1]?.trim() ? match[1].trim() : null;
  }
}
