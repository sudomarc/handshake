import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { ActiveShield } from "@/components/ActiveShield";
import { ShieldProvider } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";
import { consumeOverlayAction } from "@/lib/overlayIntent";
import { colors } from "@/lib/theme";

const OVERLAY_ACTION_TRUSTED_PEOPLE = "trusted_people";

function AutoArmWarnings() {
  useEffect(() => {
    let cancelled = false;
    const arm = async () => {
      try {
        // Android 13+: without POST_NOTIFICATIONS the protection notification is
        // hidden, so the foreground service looks like it never started.
        if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        const allowed = await callOverlayManager.canDrawOverlays();
        if (!cancelled && allowed) await callOverlayManager.startProtection();
      } catch {
        // Warnings remain opt-in when overlay setup is unavailable.
      }
    };
    void arm();
    return () => { cancelled = true; };
  }, []);
  return null;
}

/**
 * Consumes the overlay's launch-intent action.
 *
 * The previous build put `handshakeOverlayAction="verify"` on the launch intent
 * but nothing ever read it, so the button only relaunched MainActivity and left
 * the risk card on screen — a dead end. The native service now sends
 * `state=trusted_people`, and this component routes it to the trusted-people
 * screen, which is a real destination for "I do not recognise this caller".
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
    return () => { cancelled = true; };
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
          <Stack.Screen name="trusted/[pairId]" options={{ title: "Trusted person" }} />
        </Stack>
        <OverlayActionRouter />
        <AutoArmWarnings />
        <ActiveShield />
      </ShieldProvider>
    </SafeAreaProvider>
  );
}