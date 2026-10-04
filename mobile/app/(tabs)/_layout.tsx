import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/lib/theme";

function Glyph({ char, color }: { char: string; color: string }) {
  return <Text style={{ color, fontSize: 22 }}>{char}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "#71717a",
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Verify", tabBarIcon: ({ color }) => <Glyph char="✓" color={color} /> }}
      />
      <Tabs.Screen
        name="trusted"
        options={{ title: "Trusted", tabBarIcon: ({ color }) => <Glyph char="☺" color={color} /> }}
      />
    </Tabs>
  );
}
