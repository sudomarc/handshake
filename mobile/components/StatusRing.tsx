import { StyleSheet, Text, View } from "react-native";
import type { ShieldStatus } from "@/lib/shield/engine";
import { colors } from "@/lib/theme";

const PRESENTATION: Record<ShieldStatus, { color: string; title: string; subtitle: string }> = {
  safe: {
    color: colors.success,
    title: "Protection Active",
    subtitle: "No active threats",
  },
  analyzing: {
    color: colors.accent,
    title: "Analyzing",
    subtitle: "Checking the interaction",
  },
  threat: {
    color: colors.danger,
    title: "High Risk",
    subtitle: "Pressure detected",
  },
  escalated: {
    color: colors.warn,
    title: "Verifying",
    subtitle: "Identity check running",
  },
};

interface StatusRingProps {
  status: ShieldStatus;
  callActive?: boolean;
  size?: number;
  titleOverride?: string;
  subtitleOverride?: string;
}

export function StatusRing({
  status,
  callActive = false,
  size = 208,
  titleOverride,
  subtitleOverride,
}: StatusRingProps) {
  const presentation = PRESENTATION[status];
  const title = titleOverride ?? presentation.title;
  const subtitle =
    subtitleOverride ??
    (status === "safe" && callActive ? "Protected call in progress" : presentation.subtitle);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle}.`}
      style={[
        s.wrap,
        { width: size, height: size, borderRadius: size / 2, borderColor: presentation.color },
      ]}
    >
      <View
        style={[
          s.inner,
          {
            width: size - 20,
            height: size - 20,
            borderRadius: (size - 20) / 2,
            borderColor: `${presentation.color}40`,
          },
        ]}
      >
        <View
          style={[s.core, { width: size - 48, height: size - 48, borderRadius: (size - 48) / 2 }]}
        >
          <Text style={[s.title, { color: presentation.color }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={s.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  inner: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 24 },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 },
});
