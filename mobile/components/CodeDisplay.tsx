import { StyleSheet, Text, View } from "react-native";
import { useLiveCode } from "@/hooks/useLiveCode";
import { colors } from "@/lib/theme";
import { Button, Card, ErrorBox } from "./ui";

export function CodeDisplay({ pairId }: { pairId: string }) {
  const live = useLiveCode(pairId);

  if (live.status === "error") {
    return (
      <Card>
        <ErrorBox message={live.error ?? "Could not load the code."} />
        <Button label="Try again" onPress={live.retry} variant="secondary" />
      </Card>
    );
  }

  const ready = live.status === "ready";
  const digits = ready ? `${live.code.slice(0, 3)} ${live.code.slice(3)}` : "••• •••";
  const pct = ready ? Math.min(100, (live.secondsRemaining / live.periodSeconds) * 100) : 0;

  return (
    <View style={s.wrap}>
      <Text
        style={s.code}
        accessibilityLabel={
          ready ? `Current code ${live.code.split("").join(" ")}` : "Loading the code"
        }
        accessibilityLiveRegion="polite"
        selectable={false}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {digits}
      </Text>
      <View
        style={s.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: live.periodSeconds, now: live.secondsRemaining }}
      >
        <View style={[s.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.caption}>{ready ? `Changes in ${live.secondsRemaining}s` : "Loading…"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 14, paddingVertical: 8 },
  code: {
    color: colors.text,
    fontSize: 64,
    fontWeight: "700",
    letterSpacing: 6,
    fontVariant: ["tabular-nums"],
    fontFamily: "monospace",
    width: "100%",
    textAlign: "center",
  },
  track: {
    height: 12,
    width: "100%",
    borderRadius: 6,
    backgroundColor: "#262a31",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.accent, borderRadius: 6 },
  caption: { color: colors.muted, fontSize: 15 },
});
