/**
 * Shared pairing registry: one place to hand a deep-linked invite id from the
 * root layout to whichever screen is running the accept flow.
 *
 * Deep links (handshake://pair?invite=… and https://…/pair?invite=…) are parsed
 * in `app/_layout.tsx`, which stores the id here and routes to `/pair`. The
 * choice screen renders the accept flow for the param, and the scan screen
 * consumes any pending id when it regains focus — that covers "app regains
 * foreground while the scan screen is open" without coupling the layout to a
 * specific screen.
 */

let pendingInviteId: string | null = null;

/** Hands the invite id to whichever pairing surface is live. */
export function storePendingInvite(inviteId: string): void {
  pendingInviteId = inviteId;
}

/** Takes the pending id and clears it. Returns null when nothing is pending. */
export function consumePendingInvite(): string | null {
  const value = pendingInviteId;
  pendingInviteId = null;
  return value;
}

/** Reserved for the scan screen: sees a pending id without consuming it. */
export function peekPendingInvite(): string | null {
  return pendingInviteId;
}