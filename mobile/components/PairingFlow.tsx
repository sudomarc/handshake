import { useCallback, useEffect, useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { acceptInvite, getInvite } from "@/lib/trust/api";
import { colors } from "@/lib/theme";

/**
 * Device-B side of QR physical pairing: connect with the person who showed the
 * QR, then wait for them to confirm on their phone.
 *
 * This component is the single accept flow. It renders live inside the scan
 * screen after a successful barcode read, and it is also what the deep-linked
 * `/pair?invite=…` route renders (that deep link doubles as the automation /
 * emulator path for "scanning").
 *
 * Timers are cleaned up on unmount. The invite id is opaque and is never shown.
 */

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_FAILURES = 8;

type Phase =
  | { name: "loading" }
  | { name: "confirm"; displayName: string }
  | { name: "waiting"; displayName: string }
  | { name: "error"; message: string };

interface PairingAcceptFlowProps {
  inviteId: string;
  /** When provided, renders a "Go back" control (scan screen uses it to resume). */
  onCancel?: () => void;
}

function inviteGoneMessage(state: string): string {
  if (state === "expired") {
    return "This pairing code expired. Ask the other phone to create a new one.";
  }
  if (state === "cancelled") {
    return "This pairing was cancelled on the other phone.";
  }
  return "This pairing code is no longer available.";
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "We couldn't complete this pairing. Check your connection and try again.";
}

export function PairingAcceptFlow({ inviteId, onCancel }: PairingAcceptFlowProps) {
  const router = useRouter();
  const { addPair } = usePairs();
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [yourName, setYourName] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setPollFailures] = useState(0);

  const finish = useCallback(
    async (pairId: string, displayName: string) => {
      try {
        await addPair(pairId, displayName);
      } catch {
        // The relation is established server-side even if saving locally failed;
        // keep the user flowing to the detail screen, which retries server calls.
      }
      router.replace({ pathname: "/trusted/[id]", params: { id: pairId } });
    },
    [addPair, router],
  );

  const load = useCallback(async () => {
    setPhase({ name: "loading" });
    setPollFailures(0);
    try {
      const status = await getInvite(inviteId);
      if (status.state === "pending") {
        setPhase({ name: "confirm", displayName: status.displayName });
      } else if (status.state === "accepted") {
        setPhase({ name: "waiting", displayName: status.displayName });
      } else if (status.state === "confirmed" && status.pairId) {
        await finish(status.pairId, status.displayName);
      } else {
        setPhase({ name: "error", message: inviteGoneMessage(status.state) });
      }
    } catch (error) {
      setPhase({ name: "error", message: friendlyError(error) });
    }
  }, [inviteId, finish]);

  const poll = useCallback(async () => {
    try {
      const status = await getInvite(inviteId);
      setPollFailures(0);
      if (status.state === "confirmed" && status.pairId) {
        await finish(status.pairId, status.displayName);
      } else if (status.state === "accepted" || status.state === "pending") {
        // New object identity re-triggers the waiting effect below.
        setPhase({ name: "waiting", displayName: status.displayName });
      } else {
        setPhase({ name: "error", message: inviteGoneMessage(status.state) });
      }
    } catch {
      setPollFailures((count) => {
        const next = count + 1;
        if (next >= MAX_POLL_FAILURES) {
          setPhase({
            name: "error",
            message: "Handshake can't reach the server. Check your connection.",
          });
        }
        return next;
      });
    }
  }, [inviteId, finish]);

  useEffect(() => {
    void load();
    return () => {
      // Poll timers are scoped to their own effect below; nothing to clear here.
    };
  }, [load]);

  useEffect(() => {
    if (phase.name !== "waiting") return;
    const timer = setTimeout(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [phase, poll]);

  async function confirmAndEnroll() {
    const name = yourName.trim();
    if (!name) {
      setPhase((prev) =>
        prev.name === "confirm"
          ? { name: "error", message: "Enter your name so the other phone knows who you are." }
          : prev,
      );
      return;
    }
    setBusy(true);
    try {
      const result = await acceptInvite({ inviteId, displayName: name });
      const peerName = phase.name === "confirm" ? phase.displayName : "Someone";
      await addPair(result.pairId, peerName);
      setPhase({ name: "waiting", displayName: peerName });
    } catch (error) {
      setPhase({ name: "error", message: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  if (phase.name === "loading") {
    return (
      <Card>
        <Body muted>Checking this pairing code…</Body>
      </Card>
    );
  }

  if (phase.name === "error") {
    return (
      <Card>
        {phase.message ? <ErrorBox message={phase.message} /> : null}
        <Button label="Try again" onPress={() => void load()} />
        {onCancel ? <Button label="Go back" variant="secondary" onPress={onCancel} /> : null}
      </Card>
    );
  }

  if (phase.name === "waiting") {
    return (
      <Card>
        <H2>Waiting for confirmation</H2>
        <Body muted>
          {phase.displayName} needs to confirm on their phone. Keep this screen open.
        </Body>
        <Body muted>This usually takes a few seconds.</Body>
        {onCancel ? <Button label="Go back" variant="secondary" onPress={onCancel} /> : null}
      </Card>
    );
  }

  // phase.name === "confirm"
  return (
    <Card>
      <H2>Connect with {phase.displayName || "this person"}?</H2>
      <Body muted>
        After they confirm, both phones will recognise each other automatically during calls. No
        codes to read or type later.
      </Body>
      <TextInput
        value={yourName}
        onChangeText={(value) => setYourName(value)}
        placeholder="Your name"
        placeholderTextColor="#52525b"
        style={s.input}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
        accessibilityLabel="Your name"
      />
      <Button
        label={busy ? "Connecting…" : "Confirm connection"}
        onPress={() => void confirmAndEnroll()}
        busy={busy}
      />
      {onCancel ? <Button label="Go back" variant="secondary" onPress={onCancel} /> : null}
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
});
