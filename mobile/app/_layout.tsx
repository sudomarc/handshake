import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ActiveShield } from "@/components/ActiveShield";
import { ShieldProvider } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";
import { colors } from "@/lib/theme";

function AutoArmCallProtection() {
  useEffect(() => {
    let cancelled = false;

    const arm = async () => {
      try {
        const allowed = await callOverlayManager.canDrawOverlays();
        if (!cancelled && allowed) {
          await callOverlayManager.startProtection();
        }
      } catch {
        // The in-app protection UI remains available when cross-app overlay setup fails.
      }
    };

    void arm();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <Stack.Screen name="verify/[pairId]" options={{ title: "Trust Ping" }} />
          <Stack.Screen name="codes/[pairId]" options={{ title: "My code" }} />
          <Stack.Screen name="call/protection" options={{ title: "Call Protection" }} />
        </Stack>
        <AutoArmCallProtection />
        <ActiveShield />
      </ShieldProvider>
    </SafeAreaProvider>
  );
}
