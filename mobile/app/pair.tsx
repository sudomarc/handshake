import { useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { PageShell } from "@/components/PageShell";
import { PairingAcceptFlow } from "@/components/PairingFlow";
import { usePairs } from "@/hooks/usePairs";
import {
  confirmInvite,
  createInvite,
  getInvite,
  inviteQrUrl,
  parsePairInvite,
  type InviteStatus,
} from "@/lib/trust/api";
import { colors } from "@/lib/theme";

const POLL_MS = 1500;
const MAX_POLL_FAILURES = 10;

function inviteGoneMessage(state: string): string {
  if (state === "expired") {
    return "This pairing code expired. Start a new one.";
  }
  if (state === "cancelled") {
    return "This pairing was cancelled.";
  }
  return "This pairing code is no longer available.";
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "We couldn't complete this pairing. Check your connection and try again.";
}

/**
 * "Show my QR" side: creates a one-time invite, renders its QR, waits for the
 * other phone to scan and accept, shows the acceptor, and on confirm finishes
 * both-sided enrollment.
 */
function ShowQrFlow({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { addPair } = usePairs();
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [phase, setPhase] = useState<"input" | "loading" | "waiting" | "accepted" | "error">(
    "input",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const failuresRef = useRef(0);

  const start = useCallback(async (nameInput: string) => {
    setPhase("loading");
    setErrorMsg("");
    failuresRef.current = 0;
    try {
      const created = await createInvite(nameInput.trim() || "My phone");
      setInviteId(created.inviteId);
      setStatus({
        inviteId: created.inviteId,
        displayName: created.displayName,
        peerName: null,
        state: "pending",
        createdAt: "",
        expiresAt: created.expiresAt,
      });
      setPhase("waiting");
    } catch (e) {
      setPhase("error");
      setErrorMsg(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting" && phase !== "accepted") return;
    const timer = setInterval(async () => {
      if (!inviteId) return;
      try {
        const s = await getInvite(inviteId);
        setStatus(s);
        failuresRef.current = 0;
        if (s.state === "accepted") setPhase("accepted");
        else if (s.state === "pending") setPhase("waiting");
        else if (s.state === "confirmed") {
          clearInterval(timer);
          await addPair(s.pairId as string, s.peerName ?? "Trusted person");
          router.replace({ pathname: "/trusted/[id]", params: { id: s.pairId as string } });
        } else {
          clearInterval(timer);
          setPhase("error");
          setErrorMsg(inviteGoneMessage(s.state));
        }
      } catch {
        failuresRef.current += 1;
        if (failuresRef.current >= MAX_POLL_FAILURES) {
          clearInterval(timer);
          setPhase("error");
          setErrorMsg("Handshake can't reach the server. Check your connection.");
        }
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, inviteId, addPair, router]);

  async function confirm() {
    if (!inviteId || !status?.pairId) return;
    setBusy(true);
    try {
      await confirmInvite({ inviteId, pairId: status.pairId });
      await addPair(status.pairId, status.peerName ?? "Trusted person");
      onDone();
      router.replace({ pathname: "/trusted/[id]", params: { id: status.pairId } });
    } catch (e) {
      setPhase("error");
      setErrorMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const expiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;

  if (phase === "error") {
    return (
      <Card>
        <ErrorBox message={errorMsg} />
        <Button label="Try again" onPress={() => void start(displayName)} />
        <Button label="Go back" variant="secondary" onPress={onDone} />
      </Card>
    );
  }

  if (phase === "input") {
    return (
      <Card>
        <H2>1. Show this QR</H2>
        <Body muted>Enter this phone’s name so the other phone knows who is asking.</Body>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name for this phone"
          placeholderTextColor="#52525b"
          style={s.input}
          autoCapitalize="words"
          maxLength={40}
          accessibilityLabel="Your name"
        />
        <Button label="Create pairing code" onPress={() => void start(displayName)} />
        <Button label="Go back" variant="secondary" onPress={onDone} />
      </Card>
    );
  }

  return (
    <Card>
      <H2>1. Show this QR</H2>
      <Body muted>Ask the other phone to scan it. It expires shortly.</Body>

      {inviteId ? (
        <View style={s.qrWrap}>
          <Image
            source={{ uri: inviteQrUrl(inviteId) ?? undefined }}
            style={s.qr}
            accessibilityLabel="Pairing QR code"
          />
        </View>
      ) : (
        <Body muted>Creating pairing code…</Body>
      )}

      {expiresAt ? <Body muted>Expires at {expiresAt.toLocaleTimeString()}</Body> : null}

      {status?.state === "accepted" && status.peerName ? (
        <>
          <Body>{status.peerName} wants to connect with you.</Body>
          <Button
            label={busy ? "Confirming…" : `Confirm ${status.peerName}`}
            onPress={() => void confirm()}
            busy={busy}
          />
        </>
      ) : (
        <Body muted>Waiting for them to accept on their phone…</Body>
      )}
    </Card>
  );
}

/** "Scan a QR" side: reads the invite id and renders the accept flow. */
function ScanQrFlow({ onBack }: { onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scanError, setScanError] = useState("");

  if (scannedId) {
    return (
      <PairingAcceptFlow inviteId={scannedId} onCancel={() => setScannedId(null)} />
    );
  }

  if (!permission) {
    return (
      <Card>
        <Body muted>Checking camera permission…</Body>
      </Card>
    );
  }
  if (!permission.granted) {
    return (
      <Card>
        <Body muted>
          Camera access is needed to scan the QR code on the other phone.
        </Body>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
        <Button label="Go back" variant="secondary" onPress={onBack} />
      </Card>
    );
  }

  return (
    <Card>
      <H2>2. Scan their QR code</H2>
      <Body muted>Point the camera at the QR on the other phone.</Body>
      <View style={s.cameraWrap}>
        <CameraView
          style={s.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            const inviteId = parsePairInvite(data);
            if (inviteId) {
              setScannedId(inviteId);
            } else {
              setScanError("That QR code isn't a Handshake pairing code.");
            }
          }}
        />
      </View>
      {scanError ? <ErrorBox message={scanError} /> : null}
      <Button label="Go back" variant="secondary" onPress={onBack} />
    </Card>
  );
}

export default function PairScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const inviteFromUrl = typeof params.invite === "string" ? params.invite : undefined;
  const [mode, setMode] = useState<
    "choice" | "show" | "scan" | "accept"
  >(() => (inviteFromUrl ? "accept" : "choice"));

  // If a new deep link arrives while the screen is open, jump to accept.
  useEffect(() => {
    if (inviteFromUrl) setMode("accept");
  }, [inviteFromUrl]);

  if (mode === "accept" && inviteFromUrl) {
    return (
      <PageShell title="Add trusted person">
        <PairingAcceptFlow inviteId={inviteFromUrl} onCancel={() => setMode("choice")} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Add trusted person">
      <Body muted>
        Two phones, one pairing. One shows a code, the other scans it — then both confirm. No
        codes to type or read out later.
      </Body>

      {mode === "choice" ? (
        <>
          <Button label="Show my QR" onPress={() => setMode("show")} />
          <Button label="Scan a QR" variant="secondary" onPress={() => setMode("scan")} />
        </>
      ) : mode === "show" ? (
        <ShowQrFlow onDone={() => router.replace("/trusted")} />
      ) : (
        <ScanQrFlow onBack={() => setMode("choice")} />
      )}
    </PageShell>
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
  qrWrap: { alignItems: "center", paddingVertical: 12 },
  qr: { width: 260, height: 260, backgroundColor: "#fff", borderRadius: 12 },
  cameraWrap: { borderRadius: 16, overflow: "hidden" },
  camera: { width: "100%", height: 360 },
});
