import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { useShield } from "@/lib/shield/engine";

export default function ShieldHome() {
  const router = useRouter();
  const { activePair } = usePairs();
  const { status, callActive } = useShield();

  const openVerification = () => {
    if (activePair) {
      router.push({ pathname: "/verify/[pairId]", params: { pairId: activePair.pairId } });
      return;
    }
    router.push("/trusted");
  };

  return (
    <PageShell title="Handshake">
      <View style={s.ringWrap}>
        <StatusRing status={status} callActive={callActive} />
      </View>

      <Body muted style={s.center}>
        {callActive
          ? "Protection is active. Handshake will surface a verification or risk state when needed."
          : activePair
            ? "Verify a trusted person with a rotating code."
            : "Add a trusted person to start verification."}
      </Body>

      <Button
        label={activePair ? "Verify a person" : "Add a trusted person"}
        onPress={openVerification}
      />

      <Button
        label="My trusted people"
        variant="secondary"
        onPress={() => router.push("/trusted")}
      />
    </PageShell>
  );
}

const s = StyleSheet.create({
  ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  center: { textAlign: "center" },
});
