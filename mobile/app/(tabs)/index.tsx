import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button, Card, H2 } from "@/components/ui";
import { useShield } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";

export default function ShieldHome() {
  const router = useRouter();
  const { status, callActive, primaryLabel, startAnalysis } = useShield();

  return (
    <PageShell title="Handshake">
      <View style={s.ringWrap}>
        <StatusRing status={status} callActive={callActive} />
      </View>
      <Body muted style={s.center}>
        {callActive
          ? "A protected call is live. Handshake picks the check."
          : "Handshake watches the interaction and picks the check."}
      </Body>
      <Button label={primaryLabel} onPress={startAnalysis} />
      <Button
        label={callActive ? "Return to protected call" : "Start protected call"}
        variant="secondary"
        onPress={() => router.push("/call/protection")}
      />

      <CallOverlayCard />
    </PageShell>
  );
}


function CallOverlayCard() {
  const [overlayAllowed, setOverlayAllowed] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    void callOverlayManager
      .canDrawOverlays()
      .then(setOverlayAllowed)
      .catch(() => setOverlayAllowed(false));
  }, []);

  const enableOverlay = async () => {
    if (!overlayAllowed) {
      await callOverlayManager.openSettings();
      return;
    }
    try {
      await callOverlayManager.startProtection();
      setArmed(true);
    } catch (error) {
      Alert.alert(
        "Call protection unavailable",
        error instanceof Error ? error.message : "Could not start the cross-app overlay.",
      );
    }
  };

  const testRisk = async () => {
    try {
      await callOverlayManager.showRisk(
        "Suspicious request detected",
        "Test alert: this is how Handshake can warn you while another call app is on screen.",
      );
    } catch (error) {
      Alert.alert(
        "Overlay test failed",
        error instanceof Error ? error.message : "Could not show the overlay.",
      );
    }
  };

  const stopOverlay = async () => {
    await callOverlayManager.stopProtection();
    setArmed(false);
  };

  return (
    <Card style={s.overlayCard}>
      <H2>Cross-app call protection</H2>
      <Body muted>
        Arm the floating Handshake shield, then switch to WhatsApp, Meet, or another call app.
        The protection banner stays above the call screen.
      </Body>
      {!overlayAllowed ? (
        <Button label="Allow floating protection" onPress={() => void enableOverlay()} />
      ) : !armed ? (
        <Button label="Arm call protection" onPress={() => void enableOverlay()} />
      ) : (
        <>
          <Body style={s.armedText}>● Protection armed</Body>
          <Button label="Test risk alert" variant="danger" onPress={() => void testRisk()} />
          <Button label="Stop protection" variant="secondary" onPress={() => void stopOverlay()} />
        </>
      )}
      <Body muted style={s.overlayNote}>
        Android will ask for “Display over other apps”. Real-time analysis of third-party call audio
        is a separate platform capability and is not claimed by this test.
      </Body>
    </Card>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  center: { textAlign: "center" },
  overlayCard: { marginTop: 4 },
  armedText: { color: "#4ade80", fontWeight: "700" },
  overlayNote: { fontSize: 13, lineHeight: 19 },
});
