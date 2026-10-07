import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusRing } from "@/components/StatusRing";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { MAX_TRANSCRIPT_LENGTH } from "@/lib/apiTypes";
import { useShield } from "@/lib/shield/engine";
import { colors, MIN_TOUCH } from "@/lib/theme";

function Frame({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom", "left", "right"]}>
      <View style={s.header}>
        <Text style={s.brand}>Handshake</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close shield"
          onPress={onClose}
          hitSlop={12}
          style={s.closeHit}
        >
          <Text style={s.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <View style={s.centered}>{children}</View>;
}

export function ActiveShield() {
  const shield = useShield();
  const { status, check, challenge, challengeLoading, challengeError, escalationOutcome } = shield;

  if (status === "safe") return null;

  const pressure = check?.result;

  let body: ReactNode = null;

  if (status === "analyzing" && shield.checking) {
    body = (
      <Centered>
        <ActivityIndicator size="large" color={colors.accent} />
        <H2 style={s.centerText}>Analyzing…</H2>
        <Body muted style={s.centerText}>
          Checking for pressure tactics, urgency and payment demands.
        </Body>
        <Body muted style={s.centerText}>
          You can keep the Phone app, WhatsApp, or another calling app open while you check the interaction.
        </Body>
      </Centered>
    );
  } else if (status === "analyzing" && check?.verdict === "clear") {
    body = (
      <>
        <Centered>
          <StatusRing
            status="safe"
            size={176}
            titleOverride="All clear"
            subtitleOverride={`Pressure ${pressure?.pressureScore}/100`}
          />
        </Centered>
        <Card>
          <Body>{pressure?.reasoning}</Body>
        </Card>
        <Body muted>Text analysis is advisory. It checks pressure tactics; it does not prove who is speaking.</Body>
        <Button label="Done" onPress={shield.reset} />
      </>
    );
  } else if (status === "analyzing") {
    body = (
      <>
        <H2>Check this interaction</H2>
        <Body muted>
          Type or paste what the caller or sender said. Handshake checks for pressure tactics.
        </Body>
        <TextInput
          value={shield.transcript}
          onChangeText={shield.setTranscript}
          multiline
          maxLength={MAX_TRANSCRIPT_LENGTH}
          placeholder="What did they say?"
          placeholderTextColor="#52525b"
          style={s.input}
          accessibilityLabel="What they said"
          textAlignVertical="top"
        />
        {shield.error ? <ErrorBox message={shield.error} /> : null}
        <Button label="Run check" onPress={() => void shield.submitTranscript()} />
      </>
    );
  } else if (status === "threat") {
    body = (
      <View accessibilityRole="alert">
        <Centered>
          <StatusRing
            status="threat"
            size={176}
            titleOverride="High pressure detected"
            subtitleOverride={pressure ? `Pressure ${pressure.pressureScore}/100` : undefined}
          />
        </Centered>
        {pressure ? (
          <Card>
            <Body>{pressure.reasoning}</Body>
          </Card>
        ) : null}
        {challengeLoading ? (
          <Centered>
            <ActivityIndicator color={colors.warn} />
            <Body muted style={s.centerText}>
              Running an identity check…
            </Body>
          </Centered>
        ) : null}
        {challengeError ? (
          <>
            <ErrorBox message={challengeError} />
            <Card>
              <H2>If you are unsure</H2>
              <Body>Hang up, then call back on a number you already know.</Body>
            </Card>
            <Button label="Done" variant="secondary" onPress={shield.reset} />
          </>
        ) : null}
      </View>
    );
  } else if (status === "escalated" && escalationOutcome) {
    const passed = escalationOutcome === "pass";
    body = (
      <>
        <Centered>
          <StatusRing
            status={passed ? "safe" : "threat"}
            size={176}
            titleOverride={passed ? "Pass" : "Fail"}
            subtitleOverride={passed ? "Identity confirmed by you" : "Identity not confirmed"}
          />
        </Centered>
        {passed ? (
          <Card>
            <Body>You confirmed the answer. The shared verification matched.</Body>
          </Card>
        ) : (
          <Card style={s.dangerCard}>
            <H2 style={{ color: colors.danger }}>Hang up immediately</H2>
            <Body>Then call back on a number you already know.</Body>
          </Card>
        )}
        <Button label="Done" onPress={shield.reset} />
      </>
    );
  } else if (status === "escalated") {
    body = (
      <View accessibilityRole="alert">
        <Centered>
          <StatusRing
            status="escalated"
            size={176}
            titleOverride="Verify Identity"
            subtitleOverride="Identity check running"
          />
        </Centered>
        <Card>
          <Body muted>Ask them this to verify identity:</Body>
          <H2>{challenge?.challenge ?? "Preparing a question…"}</H2>
          {challenge ? (
            <Body muted>
              {challenge.category} · {challenge.difficulty}
            </Body>
          ) : null}
        </Card>
        <Button
          label="They answered correctly"
          disabled={!challenge}
          onPress={() => shield.resolveEscalation("pass")}
        />
        <Button
          label="Wrong or evasive"
          variant="danger"
          disabled={!challenge}
          onPress={() => shield.resolveEscalation("fail")}
        />
      </View>
    );
  }

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={shield.reset}>
      <Frame onClose={shield.reset}>{body}</Frame>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { color: colors.muted, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  closeHit: { minHeight: MIN_TOUCH, justifyContent: "center", paddingLeft: 16 },
  close: { color: colors.text, fontSize: 16, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  centered: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  centerText: { textAlign: "center" },
  input: {
    color: colors.text,
    fontSize: 16,
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  dangerCard: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
});
