import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { checkReply, openTrustPing } from "@/lib/shield/capabilities";
import { colors } from "@/lib/theme";

type Step = "idle" | "ask" | "matched" | "failed";

interface TrustPingProps {
  pairId: string;
  name: string;
}

export function TrustPing({ pairId, name }: TrustPingProps) {
  const [step, setStep] = useState<Step>("idle");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await openTrustPing(pairId);
      setReply("");
      setStep("ask");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The ping failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!/^\d{6}$/.test(reply)) {
      setError(`Type the 6 digits ${name} replied with.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const verdict = await checkReply(pairId, reply);
      setStep(verdict === "verified" ? "matched" : "failed");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't check. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setReply("");
    setError(null);
    setStep("idle");
  }

  if (step === "matched") {
    return (
      <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
        <Text accessibilityLiveRegion="polite" style={[s.verdict, { color: colors.success }]}>
          Matched
        </Text>
        <Body>It is really {name}.</Body>
        <Button label="Done" variant="secondary" onPress={restart} />
      </Card>
    );
  }

  if (step === "failed") {
    return (
      <Card style={{ backgroundColor: colors.dangerBg, borderColor: colors.danger }}>
        <Text accessibilityLiveRegion="polite" style={[s.verdict, { color: colors.danger }]}>
          Failed
        </Text>
        <Body>It is not {name}.</Body>
        <Body>
          Do not send money or share information. Hang up and call back on a number you already
          know.
        </Body>
        <Button label="Try again" variant="secondary" onPress={restart} />
      </Card>
    );
  }

  if (step === "ask") {
    return (
      <Card>
        <H2>Waiting for {name}</H2>
        <Body muted>Ask {name} for their reply, then type what they said.</Body>
        <TextInput
          value={reply}
          onChangeText={(t) => {
            setReply(t.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor="#52525b"
          style={s.replyInput}
          accessibilityLabel="Their reply"
          autoComplete="off"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void check()}
        />
        <Button label="Check reply" onPress={() => void check()} busy={busy} />
        {error ? <ErrorBox message={error} /> : null}
        <Button label="Cancel" variant="secondary" onPress={restart} />
      </Card>
    );
  }

  return (
    <Card>
      <H2>Trust Ping</H2>
      <Body muted>
        Ask {name} to confirm it is really them. You will see Matched or Failed — nothing else to
        figure out.
      </Body>
      <Button label="Send Trust Ping" onPress={() => void send()} busy={busy} />
      {error ? <ErrorBox message={error} /> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  replyInput: {
    color: colors.text,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: "center",
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  verdict: { fontSize: 26, fontWeight: "700" },
});
