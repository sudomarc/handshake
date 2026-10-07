import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button, Card, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { useShield } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";

export default function ShieldHome() {
  const router = useRouter();
  const { activePair } = usePairs();
  const { status, startAnalysis } = useShield();
  const [overlayAllowed, setOverlayAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    void callOverlayManager.canDrawOverlays()
      .then((allowed) => {
        if (mounted) setOverlayAllowed(allowed);
      })
      .catch(() => {
        if (mounted) setOverlayAllowed(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openVerification = () => {
    if (activePair) {
      router.push({ pathname: "/verify/[pairId]", params: { pairId: activePair.pairId } });
      return;
    }
    router.push("/trusted");
  };

  const enableWarnings = async () => {
    try {
      const allowed = await callOverlayManager.canDrawOverlays();
      if (!allowed) {
        Alert.alert(
          "Allow call warnings",
          "Allow Handshake to appear over other apps. This keeps warnings visible while you use the Phone app, WhatsApp, or another calling app.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open settings", onPress: () => void callOverlayManager.openSettings() },
          ],
        );
        return;
      }
      await callOverlayManager.startProtection();
      setOverlayAllowed(true);
    } catch (error) {
      Alert.alert(
        "Protection unavailable",
        error instanceof Error ? error.message : "Handshake could not enable call warnings.",
      );
    }
  };

  return (
    <PageShell title="Handshake">
      <View style={s.ringWrap}>
        <StatusRing
          status={status}
          titleOverride="Protection ready"
          subtitleOverride="Ready to verify"
        />
      </View>

      <Body muted style={s.center}>
        Use Handshake when a caller or sender asks for money, secrets, or urgent action.
      </Body>

      <Button
        label={activePair ? "Verify a person" : "Add a trusted person"}
        onPress={openVerification}
      />
      <Button label="Check a call" variant="secondary" onPress={startAnalysis} />
      <Button
        label="Trusted people"
        variant="secondary"
        onPress={() => router.push("/trusted")}
      />

      <Card>
        <H2>Call warnings</H2>
        <Body muted>
          Handshake can show a small warning over supported phone activity and other apps. You can
          use the warning layer while you use WhatsApp or another calling app. Handshake does not
          receive private call audio from those apps automatically.
        </Body>
        <Button
          label={overlayAllowed ? "Warnings enabled" : "Enable warnings"}
          variant="secondary"
          onPress={() => void enableWarnings()}
          disabled={overlayAllowed === true}
        />
      </Card>
    </PageShell>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  center: { textAlign: "center" },
});
