import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CallSession,
  CreateCallSessionRequest,
  CallOffer,
  CallAnswer,
  IceCandidate,
} from "./callSchemas";

type StoredCallSession = CallSession;

export interface CallSessionStoreState {
  sessions: StoredCallSession[];
}

export class CallSessionStore {
  private sessions = new Map<string, StoredCallSession>();
  private pendingCleanup: NodeJS.Timeout | null = null;
  private filePath: string | null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? process.env.CALL_STORE_PATH ?? null;
    if (this.filePath) {
      this.loadFromFile();
    }
    // Clean up old sessions every 5 minutes
    this.pendingCleanup = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    this.pendingCleanup.unref?.();
  }

  exportState(): CallSessionStoreState {
    return {
      sessions: Array.from(this.sessions.values()).map((s) => ({
        ...s,
        iceCandidates: [...s.iceCandidates],
      })),
    };
  }

  importState(state: CallSessionStoreState): void {
    this.sessions.clear();
    if (Array.isArray(state.sessions)) {
      for (const session of state.sessions) {
        this.sessions.set(session.sessionId, {
          ...session,
          iceCandidates: [...(session.iceCandidates || [])],
        });
      }
    }
    this.persist();
  }

  private loadFromFile(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as CallSessionStoreState;
      this.sessions.clear();
      if (Array.isArray(parsed.sessions)) {
        for (const session of parsed.sessions) {
          this.sessions.set(session.sessionId, {
            ...session,
            iceCandidates: [...(session.iceCandidates || [])],
          });
        }
      }
    } catch {
      // Ignore or start clean on unreadable file
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      const dir = dirname(this.filePath);
      mkdirSync(dir, { recursive: true });
      const state = this.exportState();
      const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
      writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
      renameSync(tmpPath, this.filePath);
    } catch {
      // Best effort persistence
    }
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    let modified = false;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > maxAge) {
        this.sessions.delete(sessionId);
        modified = true;
      }
    }
    if (modified) {
      this.persist();
    }
  }

  generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async createSession(request: CreateCallSessionRequest): Promise<CallSession> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: StoredCallSession = {
      sessionId,
      pairId: request.pairId,
      status: "pending",
      callerDeviceId: request.callerId,
      calleeDeviceId: null,
      offer: null,
      answer: null,
      iceCandidates: [],
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.persist();
    return { ...session };
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session, iceCandidates: [...session.iceCandidates] } : null;
  }

  async getSessionsByPairId(pairId: string): Promise<CallSession[]> {
    const sessions: CallSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.pairId === pairId) {
        sessions.push({ ...session, iceCandidates: [...session.iceCandidates] });
      }
    }
    return sessions;
  }

  async getPendingSessionForPair(
    pairId: string,
    excludeDeviceId: string,
  ): Promise<CallSession | null> {
    for (const session of this.sessions.values()) {
      if (
        session.pairId === pairId &&
        session.status === "pending" &&
        session.callerDeviceId !== excludeDeviceId
      ) {
        return { ...session, iceCandidates: [...session.iceCandidates] };
      }
    }
    return null;
  }

  async setOffer(sessionId: string, offer: CallOffer): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.offer = offer.offer;
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    this.persist();
    return { ...session, iceCandidates: [...session.iceCandidates] };
  }

  async setAnswer(sessionId: string, answer: CallAnswer): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.answer = answer.answer;
    session.status = "active";
    session.calleeDeviceId = answer.fromDeviceId;
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    this.persist();
    return { ...session, iceCandidates: [...session.iceCandidates] };
  }

  async addIceCandidate(sessionId: string, candidate: IceCandidate): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.iceCandidates.push({
      candidate: candidate.candidate.candidate,
      sdpMid: candidate.candidate.sdpMid,
      sdpMLineIndex: candidate.candidate.sdpMLineIndex,
      fromDeviceId: candidate.fromDeviceId,
    });
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    this.persist();
    return { ...session, iceCandidates: [...session.iceCandidates] };
  }

  async endSession(sessionId: string): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = "ended";
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    this.persist();
    return { ...session, iceCandidates: [...session.iceCandidates] };
  }

  async getIceCandidates(
    sessionId: string,
    forDeviceId: string,
  ): Promise<IceCandidate["candidate"][]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.iceCandidates
      .filter((c) => c.fromDeviceId !== forDeviceId)
      .map((c) => ({
        candidate: c.candidate,
        sdpMid: c.sdpMid,
        sdpMLineIndex: c.sdpMLineIndex,
      }));
  }

  reset(): void {
    this.sessions.clear();
    this.persist();
  }
}

export const callSessionStore = new CallSessionStore();
