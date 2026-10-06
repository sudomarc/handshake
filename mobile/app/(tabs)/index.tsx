import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button } from "@/components/ui";
import { useShield } from "@/lib/shield/engine";

export default function ShieldHome() {
  const router = useRouter();
  const { status, callActive, primaryLabel, startAnalysis } = useShield();

  return (
    <PageShell title="Handshake">
      <View style={s.ringWrap}>
        <StatusRing status={status} callActive={callActive} />
      </View>
      <Body muted style={s.center}>
        {callActive
          ? "A protected call is live. Handshake picks the check."
          : "Handshake watches the interaction and picks the check."}
      </Body>
      <Button label={primaryLabel} onPress={startAnalysis} />
      <Button
        label={callActive ? "Return to protected call" : "Start protected call"}
        variant="secondary"
        onPress={() => router.push("/call/protection")}
      />
    </PageShell>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  center: { textAlign: "center" },
});
