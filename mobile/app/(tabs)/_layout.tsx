import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0ad3fc",
        tabBarInactiveTintColor: "#71717a",
        tabBarStyle: {
          backgroundColor: "#0a0c0f",
          borderTopWidth: 1,
          borderTopColor: "rgb(40 44 52)",
          height: 80,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Verify",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="verify" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trusted"
        options={{
          title: "Trusted",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="trusted" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const size = 24;
  if (name === "verify") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={focused ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
    </svg>
  );
}
