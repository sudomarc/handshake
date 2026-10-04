import { useState } from "react";
import { Share, StyleSheet, Text, TextInput } from "react-native";
import { usePairs } from "@/hooks/usePairs";
import { api } from "@/lib/api";
import { pairIdSchema } from "@/lib/apiTypes";
import { colors } from "@/lib/theme";
import { Body, Button, Card, ErrorBox, H2 } from "./ui";

export function CreatePairForm({ onChanged }: { onChanged?: () => void }) {
  const { addPair } = usePairs();
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.createPair();
      await addPair(result.pairId, name.trim() || undefined);
      setCreated(result.pairId);
      setName("");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't create the trusted person.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const parsed = pairIdSchema.safeParse(joinId.trim().toLowerCase());
    if (!parsed.success) {
      setError("That connection ID is not valid. It has 32 letters and digits.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addPair(parsed.data, name.trim() || undefined);
      setJoinId("");
      setName("");
      onChanged?.();
    } catch {
      setError("We couldn't save this trusted person on your phone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>Add a trusted person</H2>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name (for example Mom)"
        placeholderTextColor="#52525b"
        style={s.input}
        accessibilityLabel="Name of the trusted person"
        maxLength={40}
      />
      <Button label="Create a new connection" onPress={create} busy={busy} />
      {created ? (
        <>
          <Body>Send this connection ID to your trusted person so they can join it:</Body>
          <Text selectable style={s.id}>
            {created}
          </Text>
          <Button
            label="Share the ID"
            variant="secondary"
            onPress={() => void Share.share({ message: created })}
          />
        </>
      ) : null}
      <Body muted>Or join one that someone sent you:</Body>
      <TextInput
        value={joinId}
        onChangeText={setJoinId}
        placeholder="Connection ID"
        placeholderTextColor="#52525b"
        style={s.input}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Connection ID to join"
      />
      <Button label="Join this connection" variant="secondary" onPress={join} disabled={busy} />
      {error ? <ErrorBox message={error} /> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  input: {
    color: colors.text,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  id: { color: colors.accent, fontFamily: "monospace", fontSize: 14 },
});
