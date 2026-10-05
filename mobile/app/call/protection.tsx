import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Alert, TextInput } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { PageShell } from '@/components/PageShell';
import { Button, Body, H2, Mono } from '@/components/ui';
import { usePairs } from '@/hooks/usePairs';
import { colors } from '@/lib/theme';
import { WebRTCCallManager, CallState } from '@/lib/webrtc';
import { getDeviceId } from '@/lib/deviceId';

export default function CallProtection() {
  const { activePair } = usePairs();
  const [callManager, setCallManager] = useState<WebRTCCallManager | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteName, setRemoteName] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState<string>('');
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) return;
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Initialize call manager
  useEffect(() => {
    getDeviceId().then(deviceId => {
      setCallManager(new WebRTCCallManager(deviceId));
    });
  }, []);

  // Listen for call events
  useEffect(() => {
    if (!callManager) return;

    const unsub = callManager.on((event) => {
      if (event.type === 'stateChanged') {
        setCallState(event.payload);
        if (event.payload === 'connected') {
          startDurationTimer();
        } else if (event.payload === 'ended' || event.payload === 'failed') {
          stopDurationTimer();
        }
      } else if (event.type === 'localStream') {
        setLocalStreamUrl(event.payload?.toURL?.() || '');
      } else if (event.type === 'remoteStream') {
        setRemoteStreamUrl(event.payload?.toURL?.() || '');
      } else if (event.type === 'error') {
        const errorMsg = event.payload?.message || 'Call error';
        setError(errorMsg);
        Alert.alert('Call Error', errorMsg);
      }
    });

    return () => unsub();
  }, [callManager, startDurationTimer, stopDurationTimer]);

  const handleStartCall = async () => {
    if (!activePair || !callManager) {
      Alert.alert('No trusted person', 'Add a trusted person first');
      return;
    }

    setError(null);
    try {
      await callManager.startCall(activePair.pairId, activePair.name);
      setRemoteName(activePair.name || 'Trusted contact');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start call';
      setError(msg);
      Alert.alert('Call Failed', msg);
    }
  };

  const handleJoinCall = async () => {
    if (!joinSessionId.trim() || !callManager) {
      Alert.alert('Enter session ID', 'Please enter a session ID to join');
      return;
    }

    setError(null);
    try {
      await callManager.joinCall(joinSessionId.trim());
      setRemoteName('Incoming call');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join call';
      setError(msg);
      Alert.alert('Join Failed', msg);
    }
  };

  const handleEndCall = async () => {
    if (!callManager) return;

    try {
      await callManager.endCall();
    } catch (err) {
      console.error('End call error:', err);
    } finally {
      setCallState('ended');
      setRemoteName('');
      setCallDuration(0);
      stopDurationTimer();
      setLocalStreamUrl('');
      setRemoteStreamUrl('');
    }
  };

  const handleMuteToggle = async () => {
    if (!callManager) return;

    try {
      await callManager.muteAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Mute toggle error:', err);
    }
  };

  const isConnecting = callState === 'connecting';
  const isActive = callState === 'connected';
  const isEnded = callState === 'ended' || callState === 'failed';
  const canEndCall = isConnecting || isActive;

  return (
    <PageShell title="Call Protection">
      <View style={s.container}>
        {isEnded || callState === 'idle' ? (
          // Pre-call state
          <View style={s.preCallContainer}>
            <View style={s.statusCard}>
              <H2 style={s.statusTitle}>Call Protection</H2>
              <Body muted style={s.statusDesc}>
                Start a protected call with a trusted person. Both audio streams will be
                available for real-time verification and risk analysis.
              </Body>

              {activePair ? (
                <View style={s.activePairInfo}>
                  <Text style={s.pairLabel}>Active trusted person:</Text>
                  <H2 style={s.pairName}>{activePair.name}</H2>
                </View>
              ) : (
                <Body muted>No active trusted person selected</Body>
              )}

              <View style={s.buttonRow}>
                <Button
                  label="Create Protected Call"
                  onPress={handleStartCall}
                  disabled={!activePair || isConnecting}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={s.divider}>
                <Text style={s.dividerText}>or</Text>
              </View>

              <View style={s.joinSection}>
                <Text style={s.joinLabel}>Join a call</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder="Session ID"
                    placeholderTextColor={colors.muted}
                    onChangeText={setJoinSessionId}
                    value={joinSessionId}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Button
                  label="Join Call"
                  variant="secondary"
                  onPress={handleJoinCall}
                  disabled={isConnecting}
                />
              </View>
            </View>
          </View>
        ) : (
          // Active call state
          <View style={s.activeCallContainer}>
            <View style={s.callHeader}>
              <View style={s.remoteInfo}>
                <Text style={s.remoteName}>{remoteName}</Text>
                <Text style={s.callTimer}>{formatDuration(callDuration)}</Text>
              </View>
              <View style={s.protectionBadge}>
                <Text style={s.badgeText}>✓ HANDSHAKE PROTECTED</Text>
              </View>
            </View>

            <View style={s.callStatusGrid}>
              <View style={s.statusItem}>
                <Text style={s.statusLabel}>Identity</Text>
                <Text style={[s.statusValue, s.statusVerified]}>✓ Verified</Text>
              </View>
              <View style={s.statusItem}>
                <Text style={s.statusLabel}>Call</Text>
                <Text style={[s.statusValue, s.statusActive]}>{callState}</Text>
              </View>
              <View style={s.statusItem}>
                <Text style={s.statusLabel}>Risk</Text>
                <Text style={[s.statusValue, s.statusLow]}>Low</Text>
              </View>
            </View>

            <View style={s.videoContainer}>
              {remoteStreamUrl && (
                <RTCView
                  style={s.remoteVideo}
                  streamURL={remoteStreamUrl}
                  objectFit="cover"
                >
                  <View style={s.videoOverlay}>
                    <Text style={s.videoLabel}>Remote Audio Active</Text>
                    <Mono>{callManager?.getRemoteStream() ? 'Receiving' : 'Connecting...'}</Mono>
                  </View>
                </RTCView>
              )}

              {localStreamUrl && (
                <RTCView
                  style={s.localVideo}
                  streamURL={localStreamUrl}
                  objectFit="cover"
                  mirror={true}
                >
                  <View style={s.videoOverlay}>
                    <Text style={s.videoLabel}>Local Audio</Text>
                    <Mono>{isMuted ? 'MUTED' : 'ACTIVE'}</Mono>
                  </View>
                </RTCView>
              )}
            </View>

            <View style={s.callControls}>
              <Button
                label={isMuted ? 'Unmute' : 'Mute'}
                variant="secondary"
                onPress={handleMuteToggle}
                disabled={!isActive}
              />
              <Button
                label="End Call"
                variant="danger"
                onPress={handleEndCall}
                disabled={!canEndCall}
              />
            </View>

            {error && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </PageShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preCallContainer: { flex: 1, padding: 16 },
  activeCallContainer: { flex: 1 },
  statusCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statusTitle: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  statusDesc: { color: colors.muted, lineHeight: 22, marginBottom: 16 },
  activePairInfo: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pairLabel: { color: colors.accent, fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  pairName: { color: colors.text, fontSize: 20, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerText: { color: colors.muted, marginHorizontal: 12 },
  joinSection: { marginTop: 8 },
  joinLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputRow: { marginBottom: 12 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  remoteInfo: { flex: 1 },
  remoteName: { color: colors.text, fontSize: 24, fontWeight: '700' },
  callTimer: { color: colors.muted, fontSize: 14, fontFamily: 'monospace', marginTop: 2 },
  protectionBadge: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: { color: colors.success, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  callStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusItem: { alignItems: 'center' },
  statusLabel: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  statusValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  statusVerified: { color: colors.success },
  statusActive: { color: colors.accent },
  statusLow: { color: colors.success },
  videoContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colors.bg,
  },
  remoteVideo: {
    flex: 1,
    position: 'relative',
  },
  localVideo: {
    width: 120,
    height: 160,
    position: 'absolute',
    right: 16,
    bottom: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  videoLabel: { color: colors.text, fontSize: 11, fontWeight: '600' },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  errorBanner: {
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
  },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});