/**
 * Pure parser for pairing invitation links. No runtime imports so it can be
 * unit-tested under plain Node.
 *
 * Accepted forms (the only ones the app emits or deep-links to):
 *   handshake://pair?invite=<inviteId>   (custom scheme, emitted by the QR)
 *   https://<host>/pair?invite=<inviteId> (web link)
 *
 * Note: for non-special schemes such as `handshake:`, WHATWG URL parsing puts
 * `pair` in `host` and leaves `pathname` empty, so the route must be read from
 * host + pathname for that scheme. The earlier `pathname === "/pair"` check
 * rejected every QR the app generated.
 */

/** Server-generated invite ids are 32 lowercase hex characters. */
const INVITE_ID_PATTERN = /^[a-f0-9]{32}$/;

export function parsePairInvite(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const candidate = url.trim();
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  let route: string;
  if (parsed.protocol === "handshake:") {
    route = `${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
  } else if (parsed.protocol === "https:") {
    route = parsed.pathname.replace(/\/+$/, "");
    route = route === "" ? "" : route.slice(1);
  } else {
    return null;
  }
  if (route !== "pair") return null;

  const invite = parsed.searchParams.get("invite")?.trim() ?? "";
  return INVITE_ID_PATTERN.test(invite) ? invite : null;
}
