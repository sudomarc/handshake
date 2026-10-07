import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
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
  const { pairs, activePair, removePair, setActive, updatePair } = usePairs();
  const [privateContext, setPrivateContext] = useState("");
  const [savingContext, setSavingContext] = useState(false);

  const validPairId = parsed.success ? parsed.data : null;
  const pair = validPairId ? pairs.find((p) => p.pairId === validPairId) : undefined;

  useEffect(() => {
    setPrivateContext(pair?.privateContext ?? "");
  }, [pair?.privateContext, validPairId]);

  if (!parsed.success || !validPairId) {
    return (
      <PageShell title="Verify person">
        <ErrorBox message="Invalid pair code." />
      </PageShell>
    );
  }

  const targetPairId = validPairId;
  const name = pair?.name ?? "Trusted person";
  const isActive = activePair?.pairId === targetPairId;

  function confirmRemove() {
    Alert.alert("Remove trusted person?", `${name} will be removed from this phone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removePair(targetPairId).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <PageShell title="Verify person">
      <View style={s.identity}>
        <H2>{name}</H2>
        {isActive ? <Text style={s.active}>Active</Text> : null}
      </View>

      <TrustPing pairId={validPairId} name={name} />

      <Card>
        <H2>Private verification detail</H2>
        <Body muted>
          Save a shared memory, nickname, or recent detail that only this person is likely to know.
          It stays on this phone until a personal identity question needs it.
        </Body>
        <TextInput
          value={privateContext}
          onChangeText={setPrivateContext}
          multiline
          maxLength={2000}
          placeholder="Example: Our dog is called Rover"
          placeholderTextColor="#52525b"
          style={s.contextInput}
          textAlignVertical="top"
          accessibilityLabel="Private verification detail"
        />
        <Button
          label={savingContext ? "Saving…" : "Save private detail"}
          onPress={() => {
            setSavingContext(true);
            void updatePair(validPairId, { privateContext: privateContext.trim() })
              .catch(() => {})
              .finally(() => setSavingContext(false));
          }}
          busy={savingContext}
        />
      </Card>

      <Card>
        <H2>Manage person</H2>
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
  contextInput: {
    color: colors.text,
    fontSize: 16,
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
});
