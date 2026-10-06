import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from "react-native-webrtc";
import { callApi } from "./api";

export type CallState = "idle" | "connecting" | "connected" | "ending" | "ended" | "failed";

export interface CallEvent {
  type: "stateChanged" | "localStream" | "remoteStream" | "error" | "iceCandidate";
  payload?: any;
}

type CallEventListener = (event: CallEvent) => void;

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

interface PeerConnectionWithEvents extends RTCPeerConnection {
  onicecandidate: ((event: any) => void) | null;
  onconnectionstatechange: (() => void) | null;
  ontrack: ((event: any) => void) | null;
}

export class WebRTCCallManager {
  private peerConnection: PeerConnectionWithEvents | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private state: CallState = "idle";
  private listeners: Set<CallEventListener> = new Set();
  private sessionId: string | null = null;
  private deviceId: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private processedIceCandidates: Set<string> = new Set();
  private hasRemoteDescription = false;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  on(listener: CallEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CallEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private setState(newState: CallState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit({ type: "stateChanged", payload: newState });
    }
  }

  getState(): CallState {
    return this.state;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async startCall(pairId: string, callerName?: string): Promise<string> {
    try {
      this.setState("connecting");

      // Create session on server
      const response = await callApi.post("/api/call/session", {
        pairId,
        callerId: this.deviceId,
        callerName,
      });

      this.sessionId = response.sessionId || "";

      // Initialize peer connection
      await this.createPeerConnection(true);

      // Create offer
      const offer = await this.peerConnection!.createOffer({});
      await this.peerConnection!.setLocalDescription(offer);

      // Send offer to server
      await callApi.post("/api/call/offer", {
        sessionId: this.sessionId!,
        offer: offer.toJSON(),
        fromDeviceId: this.deviceId,
      });

      // Start polling for answer and ICE candidates
      this.startPolling();

      return this.sessionId!;
    } catch (error) {
      this.setState("failed");
      this.emit({ type: "error", payload: error });
      throw error;
    }
  }

  async joinCall(sessionId: string): Promise<void> {
    try {
      this.setState("connecting");
      this.sessionId = sessionId;

      // Get session details
      const session = await callApi.get(`/api/call/session/${sessionId}?deviceId=${this.deviceId}`);

      if (!session.offer) {
        throw new Error("No offer found in session");
      }

      // Initialize peer connection
      await this.createPeerConnection(false);

      // Set remote description (offer)
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(session.offer));
      this.hasRemoteDescription = true;

      // Add any pending ICE candidates
      for (const candidate of session.iceCandidates) {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // Create answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer to server
      await callApi.post("/api/call/answer", {
        sessionId,
        answer: answer.toJSON(),
        fromDeviceId: this.deviceId,
      });

      // Start polling for ICE candidates
      this.startPolling();

      this.setState("connected");
    } catch (error) {
      this.setState("failed");
      this.emit({ type: "error", payload: error });
      throw error;
    }
  }

  private async createPeerConnection(isInitiator: boolean): Promise<void> {
    const config = {
      iceServers: DEFAULT_ICE_SERVERS,
      sdpSemantics: "unified-plan" as const,
    };

    const pc = new RTCPeerConnection(config) as PeerConnectionWithEvents;
    this.peerConnection = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        const candidateKey = `${event.candidate.candidate}:${event.candidate.sdpMid}:${event.candidate.sdpMLineIndex}`;
        if (!this.processedIceCandidates.has(candidateKey)) {
          this.processedIceCandidates.add(candidateKey);
          this.sendIceCandidate(event.candidate);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("Connection state:", state);

      if (state === "connected") {
        this.setState("connected");
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        this.setState("ended");
        this.cleanup();
      }
    };

    // Handle remote stream
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emit({ type: "remoteStream", payload: this.remoteStream });
      }
    };

    // Get local media stream
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    this.emit({ type: "localStream", payload: this.localStream });
  }

  private async sendIceCandidate(candidate: any): Promise<void> {
    if (!this.sessionId) return;

    try {
      await callApi.post("/api/call/ice", {
        sessionId: this.sessionId,
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        },
        fromDeviceId: this.deviceId,
      });
    } catch (error) {
      console.error("Failed to send ICE candidate:", error);
    }
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      if (!this.sessionId || !this.peerConnection) {
        this.stopPolling();
        return;
      }

      try {
        const session = await callApi.get(
          `/api/call/session/${this.sessionId}?deviceId=${this.deviceId}`,
        );

        // Check for answer if we're the initiator
        if (session.answer && !this.hasRemoteDescription) {
          await this.peerConnection!.setRemoteDescription(
            new RTCSessionDescription(session.answer),
          );
          this.hasRemoteDescription = true;
          this.setState("connected");
        }

        // Add new ICE candidates
        for (const candidate of session.iceCandidates) {
          const candidateKey = `${candidate.candidate}:${candidate.sdpMid}:${candidate.sdpMLineIndex}`;
          if (!this.processedIceCandidates.has(candidateKey)) {
            this.processedIceCandidates.add(candidateKey);
            await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }

        // Check if session ended
        if (session.status === "ended") {
          this.setState("ended");
          this.cleanup();
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async endCall(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await callApi.post("/api/call/end", { sessionId: this.sessionId });
    } catch (error) {
      console.error("Failed to end call on server:", error);
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.stopPolling();

    if (this.peerConnection) {
      // Remove event listeners by setting to null
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.ontrack = null;

      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.sessionId = null;
    this.processedIceCandidates.clear();
    this.hasRemoteDescription = false;

    if (this.state !== "idle" && this.state !== "ended") {
      this.setState("ended");
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  async muteAudio(mute: boolean): Promise<void> {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }
}
