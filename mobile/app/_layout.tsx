import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="verify/[pairId]" options={{ title: "Verify a call" }} />
        <Stack.Screen name="codes/[pairId]" options={{ title: "My code" }} />
        <Stack.Screen name="challenge/[pairId]" options={{ title: "Personal question" }} />
        <Stack.Screen name="analyze" options={{ title: "Pressure check" }} />
        <Stack.Screen name="first-hour" options={{ title: "The first hour" }} />
        <Stack.Screen name="call-audio-feasibility" options={{ title: "Call Audio Feasibility" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
