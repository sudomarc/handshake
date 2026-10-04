import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";
import type { Verdict } from "@/lib/apiTypes";
import { colors } from "@/lib/theme";
import { Button, Card, ErrorBox } from "./ui";

const MESSAGES: Record<Verdict, { title: string; body: string; fg: string; bg: string }> = {
  waiting: {
    title: "Waiting for the code",
    body: "Ask the caller to say the 6 digits, then type what you heard.",
    fg: colors.muted,
    bg: colors.card,
  },
  verified: {
    title: "Verified",
    body: "The caller knows the current code shared with this trusted person.",
    fg: colors.success,
    bg: colors.successBg,
  },
  "not-verified": {
    title: "Not verified",
    body: "The code does not match. Do not send money or share sensitive information. Hang up and call back on a number you already know.",
    fg: colors.danger,
    bg: colors.dangerBg,
  },
};

export function VerifyForm({ pairId }: { pairId: string }) {
  const [code, setCode] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("waiting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!/^\d{6}$/.test(code)) {
      setError("Type the 6 digits you heard.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.verifyCode(pairId, code);
      setVerdict(result.verdict);
    } catch (e) {
      setVerdict("waiting");
      setError(e instanceof Error ? e.message : "We couldn't check the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const m = MESSAGES[verdict];
  return (
    <Card>
      <Text style={s.label}>Code you heard</Text>
      <TextInput
        value={code}
        onChangeText={(t) => {
          setCode(t.replace(/\D/g, "").slice(0, 6));
          setVerdict("waiting");
          setError(null);
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor="#52525b"
        style={s.input}
        accessibilityLabel="Six digit code"
        autoComplete="off"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button label="Check the code" onPress={submit} busy={busy} />
      {error ? <ErrorBox message={error} /> : null}
      <View style={[s.result, { backgroundColor: m.bg, borderColor: m.fg }]}>
        <Text accessibilityLiveRegion="polite" style={[s.resultTitle, { color: m.fg }]}>
          {m.title}
        </Text>
        <Text style={s.resultBody}>{m.body}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  label: { color: colors.muted, fontSize: 15 },
  input: {
    color: colors.text,
    fontSize: 36,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  result: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  resultTitle: { fontSize: 22, fontWeight: "700" },
  resultBody: { color: colors.textSoft, fontSize: 16, lineHeight: 23 },
});
