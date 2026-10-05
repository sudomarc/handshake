import { MediaStream, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface RTCIceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

interface RTCSessionDescriptionInit {
  type: RTCSdpType;
  sdp: string;
}

type RTCSdpType = 'offer' | 'answer' | 'pranswer' | 'rollback';

interface RTCConfiguration {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: 'relay' | 'all';
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy?: 'require' | 'negotiate';
  peerIdentity?: string;
  certificates?: RTCCertificate[];
  sdpSemantics?: 'unified-plan' | 'plan-b';
}

declare class RTCCertificate {
  static generateCertificate(algorithm: AlgorithmIdentifier): Promise<RTCCertificate>;
  expires: Date;
}

declare class RTCPeerConnection {
  constructor(configuration?: RTCConfiguration);
  
  // Event handlers
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
  onconnectionstatechange: (() => void) | null;
  ontrack: ((event: RTCTrackEvent) => void) | null;
  onnegotiationneeded: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  onsignalingstatechange: (() => void) | null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null;

  // Methods
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate): Promise<void>;
  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender;
  removeTrack(sender: RTCRtpSender): void;
  getSenders(): RTCRtpSender[];
  getReceivers(): RTCRtpReceiver[];
  getTransceivers(): RTCRtpTransceiver[];
  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel;
  close(): void;
  
  // Properties
  readonly localDescription: RTCSessionDescription | null;
  readonly remoteDescription: RTCSessionDescription | null;
  readonly connectionState: RTCPeerConnectionState;
  readonly iceConnectionState: RTCIceConnectionState;
  readonly iceGatheringState: RTCIceGatheringState;
  readonly signalingState: RTCSignalingState;
  readonly currentRemoteDescription: RTCSessionDescription | null;
  readonly currentLocalDescription: RTCSessionDescription | null;
  readonly pendingRemoteDescription: RTCSessionDescription | null;
  readonly pendingLocalDescription: RTCSessionDescription | null;
}

interface RTCPeerConnectionIceEvent extends Event {
  candidate: RTCIceCandidate | null;
}

interface RTCTrackEvent extends Event {
  receiver: RTCRtpReceiver;
  track: MediaStreamTrack;
  streams: MediaStream[];
  transceiver: RTCRtpTransceiver;
}

interface RTCDataChannelEvent extends Event {
  channel: RTCDataChannel;
}

interface RTCRtpSender {
  track: MediaStreamTrack | null;
  transport: RTCDtlsTransport | null;
  rtcpTransport: RTCDtlsTransport | null;
}

interface RTCRtpReceiver {
  track: MediaStreamTrack;
  transport: RTCDtlsTransport | null;
  rtcpTransport: RTCDtlsTransport | null;
}

interface RTCRtpTransceiver {
  mid: string | null;
  sender: RTCRtpSender;
  receiver: RTCRtpReceiver;
  stopped: boolean;
  direction: RTCRtpTransceiverDirection;
}

type RTCRtpTransceiverDirection = 'sendrecv' | 'sendonly' | 'recvonly' | 'inactive';

interface RTCDtlsTransport {
  state: RTCDtlsTransportState;
  iceTransport: RTCIceTransport | null;
}

type RTCDtlsTransportState = 'new' | 'connecting' | 'connected' | 'closed' | 'failed';

interface RTCIceTransport {
  state: RTCIceTransportState;
  gatheringState: RTCIceGatheringState;
}

type RTCIceTransportState = 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';

type RTCIceConnectionState = 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';

type RTCIceGatheringState = 'new' | 'gathering' | 'complete';

type RTCSignalingState = 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed';

type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

interface MediaStreamTrack {
  kind: string;
  id: string;
  label: string;
  enabled: boolean;
  muted: boolean;
  readonly readyState: 'live' | 'ended';
  applyConstraints(constraints: MediaTrackConstraints): Promise<void>;
  clone(): MediaStreamTrack;
  getCapabilities(): MediaTrackCapabilities;
  getConstraints(): MediaTrackConstraints;
  getSettings(): MediaTrackSettings;
  stop(): void;
}

interface MediaTrackConstraints {}
interface MediaTrackCapabilities {}
interface MediaTrackSettings {}
interface RTCDataChannel {}
interface RTCDataChannelInit {}
interface RTCAnswerOptions {}
interface RTCOfferOptions {}
interface MediaStreamTrackEvent extends Event {
  track: MediaStreamTrack;
}