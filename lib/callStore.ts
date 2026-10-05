import { CallSession, CreateCallSessionRequest, CallOffer, CallAnswer, IceCandidate } from "@/lib/callSchemas";

type StoredCallSession = CallSession;

class CallSessionStore {
  private sessions = new Map<string, StoredCallSession>();
  private pendingCleanup: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up old sessions every 5 minutes
    this.pendingCleanup = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
    return { ...session };
  }

  async getSession(sessionId: string): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }

  async getSessionsByPairId(pairId: string): Promise<CallSession[]> {
    const sessions: CallSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.pairId === pairId) {
        sessions.push({ ...session });
      }
    }
    return sessions;
  }

  async getPendingSessionForPair(pairId: string, excludeDeviceId: string): Promise<CallSession | null> {
    for (const session of this.sessions.values()) {
      if (session.pairId === pairId && 
          session.status === "pending" && 
          session.callerDeviceId !== excludeDeviceId) {
        return { ...session };
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
    return { ...session };
  }

  async setAnswer(sessionId: string, answer: CallAnswer): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.answer = answer.answer;
    session.status = "active";
    session.calleeDeviceId = answer.fromDeviceId;
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    return { ...session };
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
    return { ...session };
  }

  async endSession(sessionId: string): Promise<CallSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = "ended";
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    return { ...session };
  }

  async getIceCandidates(sessionId: string, forDeviceId: string): Promise<IceCandidate["candidate"][]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.iceCandidates
      .filter(c => c.fromDeviceId !== forDeviceId)
      .map(c => ({
        candidate: c.candidate,
        sdpMid: c.sdpMid,
        sdpMLineIndex: c.sdpMLineIndex,
      }));
  }
}

export const callSessionStore = new CallSessionStore();