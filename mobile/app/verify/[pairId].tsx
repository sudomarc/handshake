import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { pairIdSchema } from "@/lib/apiTypes";
import { colors } from "@/lib/theme";

/**
 * Pre-call trust management for one person.
 *
 * This screen is where the trusted relationship is established and managed —
 * before any call. There is no code to read, no code to type, and no call-time
 * verification workflow. During a call, both Handshake installations authenticate
 * each other automatically through the trusted-pair protocol.
 */
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
      <PageShell title="Trusted person">
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
    <PageShell title="Trusted person">
      <View style={s.identity}>
        <H2>{name}</H2>
        {isActive ? <Text style={s.active}>Default</Text> : null}
      </View>

      <Card>
        <H2>Automatic trust</H2>
        <Body muted>
          During a call between you and {name}, both phones confirm this trusted relationship
          automatically. Nothing is read out loud and no code is typed.
        </Body>
        <Body muted>
          Handshake can confirm the relationship, but it cannot hear the call on an ordinary phone
          call or inside another calling app.
        </Body>
      </Card>

      <Card>
        <H2>Private detail</H2>
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
        {!isActive ? (
          <Button
            label="Make default"
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
