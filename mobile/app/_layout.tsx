import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ActiveShield } from "@/components/ActiveShield";
import { ShieldProvider } from "@/lib/shield/engine";
import { callOverlayManager } from "@/lib/callOverlay";
import { colors } from "@/lib/theme";

function AutoArmWarnings() {
  useEffect(() => {
    let cancelled = false;
    const arm = async () => {
      try {
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
          <Stack.Screen name="verify/[pairId]" options={{ title: "Verify person" }} />
          <Stack.Screen name="codes/[pairId]" options={{ title: "My code" }} />
        </Stack>
        <AutoArmWarnings />
        <ActiveShield />
      </ShieldProvider>
    </SafeAreaProvider>
  );
}
