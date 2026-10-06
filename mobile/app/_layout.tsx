import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActiveShield } from "@/components/ActiveShield";
import { ShieldProvider } from "@/lib/shield/engine";
import { colors } from "@/lib/theme";

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
        <ActiveShield />
      </ShieldProvider>
    </SafeAreaProvider>
  );
}
