/**
 * Call session lifecycle — one place that owns when a call starts, transitions,
 * and ends, and that swallows the duplicate/stale events Android actually emits.
 *
 * The native telephony layer emits `ringing` then `active` then `idle`, and the
 * JS trust cycle can be re-triggered by foreground events. Without a single
 * owner for the session, those duplicate starts produce overlapping trust
 * cycles and stale state pushes that make the overlay flicker or show an old
 * verdict for a new call.
 *
 * Guarantees:
 *   - at most one active session at a time (`begin` rejects a duplicate);
 *   - a state transition is accepted only for the *current*, non-expired
 *     session, so an old call's verdict can never overwrite a new call;
 *   - a session that never reaches a terminal state expires after a timeout, so
 *     a missed `idle` event cannot leave a phantom call running forever.
 *
 * Pure and clock-injected, so it is fully unit-testable.
 */

export type CallKind = "sim" | "whatsapp" | "meet" | "unknown";

export type SessionPhase = "ringing" | "active" | "ended";

export interface CallSession {
  id: string;
  kind: CallKind;
  startedAtMs: number;
  phase: SessionPhase;
  lastTransitionAtMs: number;
}

export interface CallSessionManagerOptions {
  /** Minimum gap between two `begin` calls that counts as a duplicate. */
  dedupeWindowMs?: number;
  /** A session with no transition for this long is treated as expired. */
  sessionTimeoutMs?: number;
  /** Injected id generator, for deterministic tests. */
  generateId?: () => string;
}

const DEFAULT_DEDUPE_WINDOW_MS = 2_000;
const DEFAULT_SESSION_TIMEOUT_MS = 3 * 60_000;

export class CallSessionManager {
  private current: CallSession | null = null;
  // -Infinity (not 0) so the very first `begin` is never treated as a spurious
  // restart: the dedupe guard must only apply after a session has really ended.
  private lastEndedAtMs = Number.NEGATIVE_INFINITY;
  private readonly dedupeWindowMs: number;
  private readonly sessionTimeoutMs: number;
  private readonly generateId: () => string;
  private seq = 0;

  constructor(options: CallSessionManagerOptions = {}) {
    this.dedupeWindowMs = options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
    this.sessionTimeoutMs = options.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
    this.generateId =
      options.generateId ??
      (() => {
        this.seq += 1;
        return `call-${this.seq}`;
      });
  }

  /** The live session, or null when no non-expired call is active. */
  get session(): CallSession | null {
    return this.current;
  }

  get isActive(): boolean {
    return this.current !== null;
  }

  /**
   * Starts a new call session.
   *
   * Returns null when the start is a duplicate: either a session is already
   * active, or a session ended within the dedupe window (Android often emits a
   * spurious `idle`→`active` pair around call setup).
   */
  begin(kind: CallKind, nowMs: number): CallSession | null {
    if (this.current) return null;
    if (nowMs - this.lastEndedAtMs < this.dedupeWindowMs) return null;

    this.current = {
      id: this.generateId(),
      kind,
      startedAtMs: nowMs,
      phase: "ringing",
      lastTransitionAtMs: nowMs,
    };
    return this.current;
  }

  /**
   * Advances the current session's phase.
   *
   * Returns false when `id` does not match the current session, or the session
   * has expired — in both cases the caller must ignore the transition, because
   * it belongs to a stale or finished call.
   */
  transition(id: string, phase: SessionPhase, nowMs: number): boolean {
    if (!this.current || this.current.id !== id) return false;
    if (this.isExpired(this.current, nowMs)) {
      // Treat an expired session as ended; a fresh call must re-`begin`.
      this.finish(id, nowMs);
      return false;
    }
    this.current.phase = phase;
    this.current.lastTransitionAtMs = nowMs;
    return true;
  }

  /**
   * Ends the current session. Returns true only when `id` matched the live
   * session, so a stale `idle` cannot end a newer call.
   */
  finish(id: string, nowMs: number): boolean {
    if (!this.current || this.current.id !== id) return false;
    this.current.phase = "ended";
    this.current = null;
    this.lastEndedAtMs = nowMs;
    return true;
  }

  /** True when the session has had no transition for longer than the timeout. */
  isExpired(session: CallSession, nowMs: number): boolean {
    return nowMs - session.lastTransitionAtMs > this.sessionTimeoutMs;
  }

  /**
   * Housekeeping: expires the current session when it has gone quiet. Call this
   * from a periodic tick. Returns true when a session was expired.
   */
  tick(nowMs: number): boolean {
    if (this.current && this.isExpired(this.current, nowMs)) {
      const id = this.current.id;
      return this.finish(id, nowMs);
    }
    return false;
  }
}
