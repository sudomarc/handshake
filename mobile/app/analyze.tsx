import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { api } from "@/lib/api";
import { MAX_TRANSCRIPT_LENGTH, type PressureCheckResponse } from "@/lib/apiTypes";
import { colors } from "@/lib/theme";

const VERDICT_LABEL = {
  likely_human: "Likely human",
  likely_clone: "Likely clone / scam pressure",
  uncertain: "Uncertain",
} as const;

export default function Analyze() {
  const { activePair } = usePairs();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PressureCheckResponse | null>(null);

  async function run() {
    if (!text.trim()) {
      setError("Paste or type what the caller said.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.analyzePressure(text.trim(), activePair?.pairId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The check failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Pressure check">
      <Body muted>
        Paste what the caller said. This looks for pressure tactics. It does not detect cloned
        voices.
      </Body>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={MAX_TRANSCRIPT_LENGTH}
        placeholder="What did the caller say?"
        placeholderTextColor="#52525b"
        style={s.input}
        accessibilityLabel="Caller transcript"
        textAlignVertical="top"
      />
      <Button label="Check for pressure" onPress={run} busy={busy} />
      {error ? <ErrorBox message={error} /> : null}
      {result ? (
        <Card>
          <H2>{VERDICT_LABEL[result.verdict]}</H2>
          <Text style={s.stat}>Pressure score: {result.pressureScore}/100</Text>
          <Text style={s.stat}>Human likelihood: {result.humanLikelihood}/100</Text>
          <Body>{result.reasoning}</Body>
        </Card>
      ) : null}
    </PageShell>
  );
}

const s = StyleSheet.create({
  input: {
    color: colors.text,
    fontSize: 16,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  stat: { color: colors.textSoft, fontSize: 16 },
});
