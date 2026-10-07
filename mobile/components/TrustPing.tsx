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
      setError(e instanceof Error && e.message ? e.message : "Verification could not start. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!/^\d{6}$/.test(reply)) {
      setError(`Enter the 6 digits ${name} gave you.`);
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
          Verified
        </Text>
        <Body>Verification matched for {name}.</Body>
        <Button label="Done" variant="secondary" onPress={restart} />
      </Card>
    );
  }

  if (step === "failed") {
    return (
      <Card style={{ backgroundColor: colors.dangerBg, borderColor: colors.danger }}>
        <Text accessibilityLiveRegion="polite" style={[s.verdict, { color: colors.danger }]}>
          Verification failed
        </Text>
        <Body>The shared code did not match.</Body>
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
        <H2>Verify {name}</H2>
        <Body muted>Ask {name} to say the current 6-digit code shown on their Handshake screen. Type the digits you hear.</Body>
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
          accessibilityLabel="Shared verification code"
          autoComplete="off"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void check()}
        />
        <Button label="Verify code" onPress={() => void check()} busy={busy} />
        {error ? <ErrorBox message={error} /> : null}
        <Button label="Cancel" variant="secondary" onPress={restart} />
      </Card>
    );
  }

  return (
    <Card>
      <H2>Verify {name}</H2>
      <Body muted>
        Ask {name} to confirm the interaction with the current shared code. Handshake will only tell you
        whether the verification matched.
      </Body>
      <Button label="Start verification" onPress={() => void send()} busy={busy} />
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
