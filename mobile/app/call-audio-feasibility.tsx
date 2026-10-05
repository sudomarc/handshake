import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Alert } from 'react-native';
import { PageShell } from '@/components/PageShell';
import { Button, Card, Body, H2 } from '@/components/ui';
import { callAudioManager, AudioDataEvent, VADResult, CallScreenEvent, AudioState } from '@/lib/callAudio';
import { colors } from '@/lib/theme';

const Mono = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Text style={{ fontFamily: 'monospace', ...style }}>{children}</Text>
);

export default function CallAudioFeasibility() {
  const [audioState, setAudioState] = useState<AudioState>('IDLE');
  const [config, setConfig] = useState<{ sampleRate: number; channels: number; frameMs: number } | null>(null);
  const [framesReceived, setFramesReceived] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [vadState, setVadState] = useState<'SILENCE' | 'SPEECH' | 'UNKNOWN'>('UNKNOWN');
  const [vadStats, setVadStats] = useState({ framesProcessed: 0, speechFrames: 0, durationMs: 0 });
  const [callEvents, setCallEvents] = useState<CallScreenEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [foregroundActive, setForegroundActive] = useState(false);
  const [remoteAudioStatus] = useState<'UNKNOWN' | 'DETECTED' | 'NOT_AVAILABLE'>('UNKNOWN');
  const [analysisStatus, setAnalysisStatus] = useState('NOT_STARTED');
  const frameCountRef = useRef(0);
  const sampleCountRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setErrors(prev => [...prev, 'Call Audio Feasibility only available on Android']);
      return;
    }

    loadConfig();

    const unsubAudioData = callAudioManager.on('audioData', (data: AudioDataEvent) => {
      frameCountRef.current += 1;
      sampleCountRef.current += data.data.length;
      setFramesReceived(frameCountRef.current);
      setTotalSamples(sampleCountRef.current);
      const maxSample = Math.max(...Array.from(data.data).map(Math.abs));
      const level = (maxSample / 32768) * 100;
      setCurrentLevel(level);
    });

    const unsubVAD = callAudioManager.on('vadResult', (data: VADResult) => {
      setVadState(data.state);
      setVadStats({
        framesProcessed: data.framesProcessed,
        speechFrames: data.speechDetected ? data.framesProcessed : 0,
        durationMs: data.durationMs,
      });
    });

    const unsubState = callAudioManager.on('audioState', (data: { state: AudioState }) => {
      setAudioState(data.state);
      if (data.state === 'RECORDING' || data.state === 'FOREGROUND_STARTED') {
        setAnalysisStatus('RUNNING');
      } else if (data.state === 'STOPPED' || data.state === 'FOREGROUND_STOPPED') {
        setAnalysisStatus('STOPPED');
      }
    });

    const unsubCall = callAudioManager.on('callScreen', (data: CallScreenEvent) => {
      setCallEvents(prev => [data, ...prev.slice(0, 9)]);
    });

    const unsubError = callAudioManager.on('error', (data: { error: string }) => {
      setErrors(prev => [data.error, ...prev.slice(0, 4)]);
    });

    return () => {
      unsubAudioData();
      unsubVAD();
      unsubState();
      unsubCall();
      unsubError();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await callAudioManager.getAudioConfig();
      setConfig(cfg);
    } catch (e) {
      setErrors(prev => ['Failed to load config: ' + String(e), ...prev]);
    }
  };

  const handleStartMic = async () => {
    try {
      frameCountRef.current = 0;
      sampleCountRef.current = 0;
      setFramesReceived(0);
      setTotalSamples(0);
      setVadStats({ framesProcessed: 0, speechFrames: 0, durationMs: 0 });
      await callAudioManager.startMicrophoneCapture();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleStartVoiceRecognition = async () => {
    try {
      frameCountRef.current = 0;
      sampleCountRef.current = 0;
      setFramesReceived(0);
      setTotalSamples(0);
      setVadStats({ framesProcessed: 0, speechFrames: 0, durationMs: 0 });
      await callAudioManager.startVoiceRecognitionCapture();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleStartVoiceComm = async () => {
    try {
      frameCountRef.current = 0;
      sampleCountRef.current = 0;
      setFramesReceived(0);
      setTotalSamples(0);
      setVadStats({ framesProcessed: 0, speechFrames: 0, durationMs: 0 });
      await callAudioManager.startVoiceCommunicationCapture();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleStop = async () => {
    try {
      await callAudioManager.stopCapture();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleStartForeground = async () => {
    try {
      frameCountRef.current = 0;
      sampleCountRef.current = 0;
      setFramesReceived(0);
      setTotalSamples(0);
      setVadStats({ framesProcessed: 0, speechFrames: 0, durationMs: 0 });
      setForegroundActive(true);
      await callAudioManager.startForegroundCapture();
    } catch (e) {
      setForegroundActive(false);
      Alert.alert('Error', String(e));
    }
  };

  const handleStopForeground = async () => {
    try {
      setForegroundActive(false);
      await callAudioManager.stopForegroundCapture();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleEnableCallScreening = async () => {
    try {
      await callAudioManager.enableCallScreening();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleDisableCallScreening = async () => {
    try {
      await callAudioManager.disableCallScreening();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const isRecording = audioState === 'RECORDING' || audioState === 'FOREGROUND_STARTED';

  return (
    <PageShell title="Call Audio Feasibility">
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>Handshake Call Protection</Text>
        <Text style={s.subtitle}>Feasibility Prototype — Audio Capture & Call Detection</Text>

        <Card style={s.card}>
          <H2>Status</H2>
          <View style={s.statusGrid}>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Call</Text>
              <Text style={[s.statusValue, callEvents.length > 0 ? s.statusActive : s.statusInactive]}>
                {callEvents.length > 0 ? 'detected' : 'not detected'}
              </Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Microphone</Text>
              <Text style={[s.statusValue, isRecording ? s.statusActive : s.statusInactive]}>
                {isRecording ? 'capturing' : 'idle'}
              </Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Audio Source</Text>
              <Text style={s.statusValue}>{config ? 'MIC / VOICE_RECOGNITION / VOICE_COMMUNICATION' : '—'}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Sample Rate</Text>
              <Text style={s.statusValue}>{config?.sampleRate || '—'} Hz</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Channels</Text>
              <Text style={s.statusValue}>{config?.channels || '—'}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Frames Received</Text>
              <Text style={s.statusValue}>{framesReceived}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Audio Activity</Text>
              <Text style={[s.statusValue, vadState === 'SPEECH' ? s.statusActive : vadState === 'SILENCE' ? s.statusInactive : s.statusUnknown]}>
                {vadState}
              </Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Foreground Service</Text>
              <Text style={[s.statusValue, foregroundActive ? s.statusActive : s.statusInactive]}>
                {foregroundActive ? 'active' : 'inactive'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={s.card}>
          <H2>Remote Call Audio</H2>
          <View style={s.statusGrid}>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Status</Text>
              <Text style={[s.statusValue, 
                remoteAudioStatus === 'DETECTED' ? s.statusActive : 
                remoteAudioStatus === 'NOT_AVAILABLE' ? s.statusInactive : s.statusUnknown
              ]}>
                {remoteAudioStatus}
              </Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Note</Text>
              <Text style={s.statusValue}>
                VOICE_UPLINK/DOWNLINK require CAPTURE_AUDIO_OUTPUT (system only)
              </Text>
            </View>
          </View>
        </Card>

        <Card style={s.card}>
          <H2>Real-time Metrics</H2>
          <View style={s.metricsGrid}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Input Level</Text>
              <Mono style={s.metricValue}>{currentLevel.toFixed(1)}%</Mono>
            </View>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Frames Processed</Text>
              <Mono style={s.metricValue}>{vadStats.framesProcessed}</Mono>
            </View>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Duration</Text>
              <Mono style={s.metricValue}>{(vadStats.durationMs / 1000).toFixed(1)}s</Mono>
            </View>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Total Samples</Text>
              <Mono style={s.metricValue}>{totalSamples}</Mono>
            </View>
          </View>
          <View style={s.levelBarContainer}>
            <View style={[s.levelBar, { width: `${Math.min(currentLevel, 100)}%` }]} />
          </View>
        </Card>

        <Card style={s.card}>
          <H2>Controls</H2>
          <View style={s.buttonGroup}>
            <Button label="Start MIC" onPress={handleStartMic} disabled={isRecording} />
            <Button label="Start VOICE_RECOGNITION" onPress={handleStartVoiceRecognition} disabled={isRecording} variant="secondary" />
            <Button label="Start VOICE_COMMUNICATION" onPress={handleStartVoiceComm} disabled={isRecording} variant="secondary" />
            <Button label="Stop Capture" onPress={handleStop} disabled={!isRecording} variant="danger" />
          </View>
          <View style={s.buttonGroup}>
            <Button label="Start Foreground MIC" onPress={handleStartForeground} disabled={foregroundActive} />
            <Button label="Stop Foreground" onPress={handleStopForeground} disabled={!foregroundActive} variant="danger" />
          </View>
          <View style={s.buttonGroup}>
            <Button label="Enable Call Screening" onPress={handleEnableCallScreening} />
            <Button label="Disable Call Screening" onPress={handleDisableCallScreening} variant="secondary" />
          </View>
        </Card>

        {callEvents.length > 0 && (
          <Card style={s.card}>
            <H2>Call Events (CallScreeningService)</H2>
            {callEvents.map((event, i) => (
              <View key={i} style={s.eventItem}>
                <Mono>{event.isIncoming ? 'INCOMING' : 'OUTGOING'}</Mono>
                <Body>{event.phoneNumber || 'unknown'}</Body>
                <Mono>{new Date(event.timestamp).toLocaleTimeString()}</Mono>
                <Body>Verification: {event.verificationStatus}</Body>
              </View>
            ))}
          </Card>
        )}

        {errors.length > 0 && (
          <Card style={s.card}>
            <H2>Errors</H2>
            {errors.map((err, i) => (
              <Text key={i} style={s.errorText}>{err}</Text>
            ))}
          </Card>
        )}

        <Card style={s.card}>
          <H2>Analysis Pipeline</H2>
          <View style={s.statusGrid}>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Status</Text>
              <Text style={s.statusValue}>{analysisStatus}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>VAD</Text>
              <Text style={s.statusValue}>Simple Energy-based (20ms frames)</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>STT</Text>
              <Text style={s.statusValue}>NOT IMPLEMENTED</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Risk Engine</Text>
              <Text style={s.statusValue}>NOT IMPLEMENTED</Text>
            </View>
          </View>
        </Card>

        <Card style={s.card}>
          <H2>Test Instructions</H2>
          <Body>
            1. Press "Start MIC" — speak and watch frames/level/VAD update
          </Body>
          <Body>
            2. Press "Start Foreground MIC" — put app in background, verify capture continues
          </Body>
          <Body>
            3. Make/receive a real cellular call — observe if frames continue or go to silence
          </Body>
          <Body>
            4. Enable Call Screening — receive a call from non-contact, check event fires
          </Body>
          <Body>
            5. Test with speakerphone/earpiece/bluetooth — note any audio routing changes
          </Body>
        </Card>
      </ScrollView>
    </PageShell>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  card: { marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusItem: { flex: 1, minWidth: '45%' },
  statusLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  statusActive: { color: colors.accent },
  statusInactive: { color: colors.muted },
  statusUnknown: { color: colors.warn },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  metricItem: { flex: 1, minWidth: '40%' },
  metricLabel: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  levelBarContainer: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  levelBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  eventItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  errorText: { color: colors.danger, fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
});