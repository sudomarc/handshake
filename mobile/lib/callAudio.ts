import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallAudioModule } = NativeModules;

export type AudioSource = 'MIC' | 'VOICE_RECOGNITION' | 'VOICE_COMMUNICATION';
export type AudioState = 'IDLE' | 'RECORDING' | 'STOPPED' | 'ERROR' | 'FOREGROUND_STARTED' | 'FOREGROUND_STOPPED';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  frameMs: number;
}

export interface AudioDataEvent {
  data: Int16Array;
  timestamp: number;
  sampleRate: number;
  channels: number;
}

export interface VADResult {
  state: 'SILENCE' | 'SPEECH' | 'UNKNOWN';
  inputLevel: number;
  speechDetected: boolean;
  framesProcessed: number;
  durationMs: number;
}

export interface CallScreenEvent {
  callId: string;
  phoneNumber: string | null;
  direction: number;
  isIncoming: boolean;
  timestamp: number;
  verificationStatus: number;
}

export interface CallAudioError {
  error: string;
}

class CallAudioManager {
  private emitter: NativeEventEmitter | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    if (Platform.OS === 'android' && CallAudioModule) {
      this.emitter = new NativeEventEmitter(CallAudioModule);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.emitter) {
      const nativeEventMap: Record<string, string> = {
        audioData: 'CallAudioData',
        audioState: 'CallAudioState',
        callScreen: 'CallScreenEvent',
        vadResult: 'CallVADResult',
        error: 'CallAudioError',
      };
      const nativeEvent = nativeEventMap[event];
      if (nativeEvent) {
        this.emitter.addListener(nativeEvent, (data) => this.emit(event, data));
      }
    }

    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
    if (this.emitter) {
      const nativeEventMap: Record<string, string> = {
        audioData: 'CallAudioData',
        audioState: 'CallAudioState',
        callScreen: 'CallScreenEvent',
        vadResult: 'CallVADResult',
        error: 'CallAudioError',
      };
      const nativeEvent = nativeEventMap[event];
      if (nativeEvent) {
        this.emitter.removeAllListeners(nativeEvent);
      }
    }
  }

  async startMicrophoneCapture(): Promise<{ status: string; source: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.startMicrophoneCapture();
  }

  async startVoiceRecognitionCapture(): Promise<{ status: string; source: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.startVoiceRecognitionCapture();
  }

  async startVoiceCommunicationCapture(): Promise<{ status: string; source: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.startVoiceCommunicationCapture();
  }

  async stopCapture(): Promise<{ status: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.stopCapture();
  }

  async startForegroundCapture(): Promise<{ status: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.startForegroundCapture();
  }

  async stopForegroundCapture(): Promise<{ status: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.stopForegroundCapture();
  }

  async getAudioConfig(): Promise<AudioConfig> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.getAudioConfig();
  }

  async isRecording(): Promise<{ recording: boolean }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.isRecording();
  }

  async enableCallScreening(): Promise<{ status: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.enableCallScreening();
  }

  async disableCallScreening(): Promise<{ status: string }> {
    if (!CallAudioModule) throw new Error('Native module not available');
    return CallAudioModule.disableCallScreening();
  }
}

export const callAudioManager = new CallAudioManager();