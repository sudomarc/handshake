import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button, Card, H2 } from "@/components/ui";
import { callOverlayManager } from "@/lib/callOverlay";
import { deriveOutsideCallState } from "@/lib/trust/callState";
import { pingBackend } from "@/lib/trust/api";
import {
  checkRuntimePermissions,
  needsPermissionBanner,
  requestRuntimePermissions,
  type RuntimePermissionState,
} from "@/lib/permissions";

/**
 * Outside a call, Handshake is a calm trust centre: protection status, trusted
 * people management, and nothing else. No codes, no call-check card, no
 * default-person picker — trust is established per person, before the call.
 */
export default function ShieldHome() {
  const router = useRouter();
  const [overlayAllowed, setOverlayAllowed] = useState<boolean | null>(null);
  const [whatsappAccessEnabled, setWhatsappAccessEnabled] = useState<boolean | null>(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [permissionState, setPermissionState] = useState<RuntimePermissionState | null>(
    null,
  );
  const [askingPermissions, setAskingPermissions] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const allowed = await callOverlayManager.canDrawOverlays();
      setOverlayAllowed(allowed);
      if (allowed) {
        // Returning from Android's special-access settings should restore the
        // foreground service immediately, not require a second manual tap.
        await callOverlayManager.startProtection().catch(() => false);
      }
    } catch {
      setOverlayAllowed(false);
    }
    try {
      setWhatsappAccessEnabled(await callOverlayManager.isNotificationAccessEnabled());
    } catch {
      setWhatsappAccessEnabled(false);
    }
    setBackendReachable(await pingBackend());
    setPermissionState(await checkRuntimePermissions());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const grantPermissions = async () => {
    setAskingPermissions(true);
    try {
      const state = await requestRuntimePermissions();
      setPermissionState(state);
      // If the user granted, try to (re)arm protection with the fresh state.
      if (state.notifications !== false && state.readPhoneState !== false) {
        const allowed = await callOverlayManager.canDrawOverlays();
        if (allowed) await callOverlayManager.startProtection();
      }
    } finally {
      setAskingPermissions(false);
    }
  };

  const enableProtection = async () => {
    try {
      const allowed = await callOverlayManager.canDrawOverlays();
      if (!allowed) {
        Alert.alert(
          "Turn on protection",
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
        error instanceof Error ? error.message : "Handshake could not enable protection.",
      );
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
        Handshake checks whether the person on a call is someone you already trust, before and
        during the conversation.
      </Body>

      <Button label="Add a trusted person" onPress={() => router.push("/pair")} />
      <Button
        label="Trusted people"
        variant="secondary"
        onPress={() => router.push("/trusted")}
      />

      {permissionState && needsPermissionBanner(permissionState) ? (
        <Card>
          <H2>Finish setup</H2>
          <Body muted>
            Handshake needs the phone-state and notification permissions to notice calls and
            keep protection running. Without them it cannot check calls automatically.
          </Body>
          <Button
            label={askingPermissions ? "Asking…" : "Allow permissions"}
            variant="secondary"
            onPress={() => void grantPermissions()}
            busy={askingPermissions}
          />
        </Card>
      ) : null}

      {whatsappAccessEnabled === true ? (
        <Card>
          <H2>WhatsApp call detection enabled</H2>
          <Body muted>
            Handshake can monitor WhatsApp call notifications. Detection still depends on
            WhatsApp publishing a recognizable call notification; call audio is not accessible.
          </Body>
        </Card>
      ) : null}

      {whatsappAccessEnabled === false ? (
        <Card>
          <H2>Enable WhatsApp call detection</H2>
          <Body muted>
            Android requires a separate notification-access setting for Handshake to notice
            WhatsApp call notifications. Enable Handshake on the next screen, then return here.
            This can detect call-state notifications only; it does not give Handshake access to
            WhatsApp call audio.
          </Body>
          <Button
            label="Open notification access settings"
            variant="secondary"
            onPress={() => void callOverlayManager.openNotificationAccessSettings().catch((error) =>
              Alert.alert(
                "Settings unavailable",
                error instanceof Error ? error.message : "Android settings could not be opened.",
              ),
            )}
          />
        </Card>
      ) : null}

      {overlayAllowed === false ? (
        <Card>
          <H2>Protection off</H2>
          <Body muted>
            Handshake stays honest only when it can sit over the calling screen. Turn on
            protection to see trusted / verify / risk during calls.
          </Body>
          <Button label="Turn on protection" variant="secondary" onPress={() => void enableProtection()} />
        </Card>
      ) : null}
    </PageShell>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  center: { textAlign: "center" },
});
