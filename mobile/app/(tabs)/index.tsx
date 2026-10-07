import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button, Card, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { callOverlayManager } from "@/lib/callOverlay";
import { evaluateCallTrust } from "@/lib/trust/orchestrator";
import { deriveOutsideCallState } from "@/lib/trust/callState";

/**
 * Outside a call, Handshake is a calm trust centre: protection status, trusted
 * people, and warning setup. There is no code to read, no transcript to paste,
 * and no manual "check this call" action competing with automatic call handling.
 */
export default function ShieldHome() {
  const router = useRouter();
  const { activePair } = usePairs();
  const [overlayAllowed, setOverlayAllowed] = useState<boolean | null>(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [checking, setChecking] = useState(false);

  const refreshOverlayState = useCallback(async () => {
    try {
      setOverlayAllowed(await callOverlayManager.canDrawOverlays());
    } catch {
      setOverlayAllowed(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverlayState();
  }, [refreshOverlayState]);

  useFocusEffect(
    useCallback(() => {
      void refreshOverlayState();
    }, [refreshOverlayState]),
  );

  const enableWarnings = async () => {
    try {
      const allowed = await callOverlayManager.canDrawOverlays();
      if (!allowed) {
        Alert.alert(
          "Allow call warnings",
          "Allow Handshake to show a small status over the Phone app and other calling apps. It tells you whether it can confirm a trusted person — it does not read calls.",
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

  /**
   * Confirms the trusted relationship with the default trusted person.
   *
   * This is the manual counterpart of what happens automatically during a call.
   * It runs the same mutual-authentication protocol and reports the same
   * trusted / verify outcome — no code is read aloud and nothing is typed.
   */
  const confirmTrustedPerson = async () => {
    if (!activePair) {
      router.push("/trusted");
      return;
    }
    setChecking(true);
    try {
      const result = await evaluateCallTrust({
        pairId: activePair.pairId,
        hasTrustedCircle: true,
        deviceAuthorized: true,
        role: "initiator",
      });
      setBackendReachable(result.backendReachable);
      if (result.state === "trusted") {
        Alert.alert(
          "Trusted connection confirmed",
          `Both phones confirmed this trusted relationship${
            result.peerDeviceId ? "" : ""
          }.`,
        );
        return;
      }
      Alert.alert(
        "Could not confirm",
        result.backendReachable
          ? "The other phone has not confirmed this relationship yet. It must have Handshake open, network access, and trust set up before the call."
          : "Handshake cannot reach the server, so this relationship cannot be confirmed.",
      );
    } catch {
      Alert.alert("Could not confirm", "Handshake could not check this trusted person right now.");
    } finally {
      setChecking(false);
    }
  };

  const outside = deriveOutsideCallState(backendReachable);

  return (
    <PageShell title="Handshake">
      <View style={s.ringWrap}>
        <StatusRing
          tone={outside.state === "ready" ? "ready" : "offline"}
          title={outside.label}
          subtitle={outside.detail}
        />
      </View>

      <Body muted style={s.center}>
        Handshake checks whether the person on a call is someone you already trust, before and during
        the conversation.
      </Body>

      <Button
        label={activePair ? `Confirm trust with ${activePair.name ?? "your trusted person"}` : "Add a trusted person"}
        onPress={() => void confirmTrustedPerson()}
        busy={checking}
      />
      <Button
        label="Trusted people"
        variant="secondary"
        onPress={() => router.push("/trusted")}
      />

      <Card>
        <H2>Call warnings</H2>
        <Body muted>
          Handshake shows a small status over the Phone app and other calling apps: whether it
          confirmed a trusted person, could not confirm them, or detected risk. It never shows
          "protected" for a call it has not confirmed.
        </Body>
        <Body muted>
          Handshake does not receive private call audio from the Phone app or from other calling apps
          such as WhatsApp, so it cannot analyse those conversations.
        </Body>
        <Button
          label={overlayAllowed ? "Warnings enabled" : "Enable warnings"}
          variant="secondary"
          onPress={() => void enableWarnings()}
          disabled={overlayAllowed === true}
        />
      </Card>

      <Card>
        <H2>Privacy</H2>
        <Body muted>
          Device keys and trusted relationships are stored in this phone's secure storage. Handshake
          uploads short-lived text for analysis only where it analyses audio itself, and keeps no
          recordings.
        </Body>
      </Card>
    </PageShell>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  center: { textAlign: "center" },
});