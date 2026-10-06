import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { PageShell } from "@/components/PageShell";
import { TrustPing } from "@/components/TrustPing";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { pairIdSchema } from "@/lib/apiTypes";
import { colors } from "@/lib/theme";

export default function PersonScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const router = useRouter();
  const parsed = pairIdSchema.safeParse(pairId);
  const { pairs, activePair, removePair, setActive } = usePairs();

  if (!parsed.success) {
    return (
      <PageShell title="Trust Ping">
        <ErrorBox message="Invalid pair code." />
      </PageShell>
    );
  }

  const validPairId: string = parsed.data;
  const pair = pairs.find((p) => p.pairId === validPairId);
  const name = pair?.name ?? "Trusted person";
  const isActive = activePair?.pairId === validPairId;

  function confirmRemove() {
    Alert.alert("Remove trusted person?", `${name} will be removed from this phone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removePair(validPairId).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <PageShell title="Trust Ping">
      <View style={s.identity}>
        <H2>{name}</H2>
        {isActive ? <Text style={s.active}>Active</Text> : null}
      </View>

      <TrustPing pairId={validPairId} name={name} />

      <Card>
        <H2>Manage</H2>
        <Body muted>Only you on this phone see these controls.</Body>
        <Button
          label="Show my code"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/codes/[pairId]", params: { pairId: validPairId } })
          }
        />
        {!isActive ? (
          <Button
            label="Make active"
            variant="secondary"
            onPress={() => void setActive(validPairId)}
          />
        ) : null}
        <Button label={`Remove ${name}`} variant="danger" onPress={confirmRemove} />
      </Card>
    </PageShell>
  );
}

const s = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  active: { color: colors.accent, fontWeight: "600", fontSize: 14 },
});
