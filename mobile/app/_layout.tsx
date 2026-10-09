import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ActiveShield } from "@/components/ActiveShield";
import { ShieldProvider } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";
import { consumeOverlayAction } from "@/lib/overlayIntent";
import { colors } from "@/lib/theme";
import { subscribeCallState, retryCallStateRegistration } from "@/lib/callBridge";
import { autoEvaluateCallTrust, clearCallState } from "@/lib/trust/orchestrator";
import { requestRuntimePermissions } from "@/lib/permissions";
import { parsePairInvite } from "@/lib/trust/api";
import { storePendingInvite } from "@/lib/pairing";

const OVERLAY_ACTION_TRUSTED_PEOPLE = "trusted_people";

/**
 * Asks for the two runtime permissions and arms the protection service when
 * the overlay is allowed. Replaces the old POST_NOTIFICATIONS-only handler.
 * Denials are non-fatal: the home banner reports them and offers a retry.
 */
function AutoArmProtection() {
  useEffect(() => {
    let cancelled = false;
    const arm = async () => {
      try {
        const state = await requestRuntimePermissions();
        void state; // state surfaces on the home banner; we don't block arming
        // If READ_PHONE_STATE was just granted, retry native listener registration
        // so call-state events flow to JS immediately for the first call.
        if (state.readPhoneState === true) {
          await retryCallStateRegistration();
        }
        const allowed = await callOverlayManager.canDrawOverlays();
        if (!cancelled && allowed) await callOverlayManager.startProtection();
      } catch {
        // Protection stays opt-in; the home surface explains the state.
      }
    };
    void arm();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

/**
 * Routes overlay launch-intent actions to a real destination. The risk card's
 * "Trusted people" button comes through as `state=trusted_people`.
 */
function OverlayActionRouter() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const action = await consumeOverlayAction();
      if (!cancelled && action === OVERLAY_ACTION_TRUSTED_PEOPLE) {
        router.push("/trusted");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

/**
 * Automatic call-start trust. Native call-state events drive one trust cycle
 * per call; no user action is involved. `clearCallState` runs on idle so the
 * overlay returns to its outside-call state.
 */
function CallStateAutomation() {
  useEffect(() => {
    const unsubscribe = subscribeCallState((payload) => {
      if (payload.state === "idle") {
        void clearCallState().catch(() => {});
        return;
      }
      void autoEvaluateCallTrust().catch(() => {});
    });
    return unsubscribe;
  }, []);
  return null;
}

/**
 * Routes pairing deep links (handshake://pair?invite=…, and the URL scheme
 * variant emitted by the QR) into the accept flow so the scan screen is not
 * the only way to reach it — the deep link also covers automation/emulator.
 */
function DeepLinkRouter() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const handle = (url: string | null | undefined) => {
      const inviteId = parsePairInvite(url);
      if (!inviteId || cancelled) return;
      storePendingInvite(inviteId);
      router.push({ pathname: "/pair", params: { invite: inviteId } });
    };

    void Linking.getInitialURL().then((url) => handle(url));
    const subscription = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ShieldProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="trusted/[id]" options={{ title: "Trusted person" }} />
          <Stack.Screen name="pair" options={{ title: "Add trusted person" }} />
        </Stack>
        <OverlayActionRouter />
        <DeepLinkRouter />
        <CallStateAutomation />
        <AutoArmProtection />
        <ActiveShield />
      </ShieldProvider>
    </SafeAreaProvider>
  );
}
