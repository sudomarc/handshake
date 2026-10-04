import { useRouter } from "expo-router";
import { Alert, Text, View } from "react-native";
import { CreatePairForm } from "@/components/CreatePairForm";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { colors } from "@/lib/theme";

export default function Trusted() {
  const router = useRouter();
  const { pairs, activePair, loading, removePair, setActive, refresh } = usePairs();

  function confirmRemove(pairId: string, name?: string) {
    Alert.alert(
      "Remove trusted person?",
      `${name ?? "This person"} will be removed from this phone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => void removePair(pairId) },
      ],
    );
  }

  return (
    <PageShell title="Trusted people">
      <Body muted>
        A trusted person is someone you know in real life. You share a private code that changes
        every 30 seconds.
      </Body>

      {loading ? (
        <Body muted>Loading…</Body>
      ) : pairs.length === 0 ? (
        <Card>
          <Body>No trusted person yet. Add one below.</Body>
        </Card>
      ) : (
        pairs.map((p) => (
          <Card key={p.pairId}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <H2>{p.name ?? "Trusted person"}</H2>
              {activePair?.pairId === p.pairId ? (
                <Text style={{ color: colors.accent, fontWeight: "600" }}>Active</Text>
              ) : null}
            </View>
            <Button
              label="Verify a call"
              onPress={() =>
                router.push({ pathname: "/verify/[pairId]", params: { pairId: p.pairId } })
              }
            />
            <Button
              label="Show my code"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/codes/[pairId]", params: { pairId: p.pairId } })
              }
            />
            {activePair?.pairId !== p.pairId ? (
              <Button
                label="Make active"
                variant="secondary"
                onPress={() => void setActive(p.pairId)}
              />
            ) : null}
            <Button
              label="Remove"
              variant="danger"
              onPress={() => confirmRemove(p.pairId, p.name)}
            />
          </Card>
        ))
      )}

      <CreatePairForm onChanged={() => void refresh()} />
    </PageShell>
  );
}
