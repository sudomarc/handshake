import { useState } from "react";
import { Share, StyleSheet, Text, TextInput } from "react-native";
import { usePairs } from "@/hooks/usePairs";
import { api } from "@/lib/api";
import { pairIdSchema } from "@/lib/apiTypes";
import { enrollDevice } from "@/lib/trust/api";
import { colors } from "@/lib/theme";
import { Body, Button, Card, ErrorBox, H2 } from "./ui";

/**
 * Adds a trusted person **before** the call.
 *
 * Creating or joining a connection also enrols this phone with the trust
 * backend. That enrolment is what lets two Handshake installations recognise
 * each other automatically during the call later — no code is read out loud and
 * nothing is typed during the conversation itself.
 */
export function CreatePairForm({ onChanged }: { onChanged?: () => void }) {
  const { addPair } = usePairs();
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.createPair();
      await addPair(result.pairId, name.trim() || undefined);
      setCreated(result.pairId);
      setName("");
      onChanged?.();
      // Best effort: the relationship is saved locally regardless, and the
      // person screen retries enrolment if this fails.
      void enrollDevice(result.pairId, name.trim() || undefined).catch(() => {});
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
    setNotice(null);
    try {
      await addPair(parsed.data, name.trim() || undefined);
      setJoinId("");
      setName("");
      onChanged?.();
      try {
        await enrollDevice(parsed.data, name.trim() || undefined);
        setNotice("This phone will confirm calls with this person automatically.");
      } catch {
        setNotice("Saved on this phone. Automatic confirmation needs the server when you next open this person.");
      }
    } catch {
      setError("We couldn't save this trusted person on your phone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <H2>Add a trusted person</H2>
      <Body muted>
        Set this up before the call. During the call, both phones confirm it automatically.
      </Body>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name (for example Mum)"
        placeholderTextColor="#52525b"
        style={s.input}
        accessibilityLabel="Name of the trusted person"
        maxLength={40}
      />
      <Button label="Create connection" onPress={create} busy={busy} />
      {created ? (
        <>
          <Body>Share this connection ID with the other person so they can join:</Body>
          <Text selectable style={s.id}>
            {created}
          </Text>
          <Button
            label="Share connection ID"
            variant="secondary"
            onPress={() => void Share.share({ message: created })}
          />
        </>
      ) : null}
      <Body muted>Or join a connection someone sent you:</Body>
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
      {notice ? <Body muted>{notice}</Body> : null}
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