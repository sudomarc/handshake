import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Card, H2 } from "@/components/ui";
import { useShield } from "@/lib/shield/engine";
import { colors, MIN_TOUCH } from "@/lib/theme";

/**
 * In-app risk surface for a call Handshake is analysing.
 *
 * It renders only when real analysis produced a risk signal. It is not a manual
 * transcript form: there is no input, because there is nothing for the user to
 * type during an automatic call.
 */
export function ActiveShield() {
  const { status, check, audioAnalysable, unavailableReason, reset } = useShield();

  if (status !== "risk" || !check) return null;

  const pressure = check.result;

  const body: ReactNode = (
    <View accessibilityRole="alert" style={s.content}>
      <Card>
        <H2>Risk detected</H2>
        <Body muted>Pressure {pressure.pressureScore}/100 during this call.</Body>
        <Body>{pressure.reasoning}</Body>
      </Card>
      <Card>
        <H2>What to do</H2>
        <Body>Hang up. Do not send money, share codes, or install anything they asked for.</Body>
        <Body>Call back on a number you already know.</Body>
      </Card>
      <Button label="Dismiss" onPress={reset} />
      {!audioAnalysable && unavailableReason ? (
        <Body muted>{unavailableReason}</Body>
      ) : null}
    </View>
  );

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={reset}>
      <SafeAreaView style={s.root} edges={["top", "bottom", "left", "right"]}>
        <View style={s.header}>
          <Text style={s.brand}>Handshake</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={reset}
            hitSlop={12}
            style={s.closeHit}
          >
            <Text style={s.close}>Close</Text>
          </Pressable>
        </View>
        {body}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { color: colors.muted, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  closeHit: { minHeight: MIN_TOUCH, justifyContent: "center", paddingLeft: 16 },
  close: { color: colors.text, fontSize: 16, fontWeight: "600" },
  content: { padding: 20, gap: 16 },
});