import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

/**
 * The one visual state indicator, shared by the home surface and the trusted
 * person screen.
 *
 * It takes an explicit tone rather than an internal enum, so a screen can never
 * render a protection colour it has not been given evidence for.
 */
export type StatusTone = "ready" | "trusted" | "verify" | "risk" | "offline";

const PRESENTATION: Record<StatusTone, { color: string }> = {
  ready: { color: colors.accent },
  trusted: { color: colors.success },
  verify: { color: colors.warn },
  risk: { color: colors.danger },
  offline: { color: colors.muted },
};

interface StatusRingProps {
  tone: StatusTone;
  title: string;
  subtitle?: string;
  size?: number;
}

export function StatusRing({ tone, title, subtitle, size = 208 }: StatusRingProps) {
  const color = PRESENTATION[tone].color;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}.` : `${title}.`}
      style={[
        s.wrap,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
      ]}
    >
      <View
        style={[
          s.inner,
          {
            width: size - 20,
            height: size - 20,
            borderRadius: (size - 20) / 2,
            borderColor: `${color}40`,
          },
        ]}
      >
        <View
          style={[
            s.core,
            { width: size - 48, height: size - 48, borderRadius: (size - 48) / 2 },
          ]}
        >
          <Text style={[s.title, { color }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={s.subtitle} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  inner: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  core: { alignItems: "center", justifyContent: "center", paddingHorizontal: 6, paddingVertical: 6, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 24 },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4 },
});