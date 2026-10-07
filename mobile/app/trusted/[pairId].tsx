import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { pairIdSchema } from "@/lib/apiTypes";
import { getCircle, revokeDevice, type CircleDevice } from "@/lib/trust/api";
import { getDeviceId } from "@/lib/trust/deviceIdentity";
import { colors } from "@/lib/theme";

/**
 * Pre-call trust management for one person.
 *
 * This screen deliberately has **no code to read, no code to type, and no
 * `MyCode` entry point**. Trust is established once, here, before the call; from
 * then on the two Handshake installations authenticate each other automatically
 * during the call.
 */
export default function TrustedPersonScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const router = useRouter();
  const parsed = pairIdSchema.safeParse(pairId);
  const { pairs, activePair, removePair, setActive, updatePair } = usePairs();

  const [devices, setDevices] = useState<CircleDevice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localDeviceId, setLocalDeviceId] = useState<string | null>(null);

  const validPairId = parsed.success ? parsed.data : null;
  const pair = validPairId ? pairs.find((p) => p.pairId === validPairId) : undefined;
  const name = pair?.name ?? "Trusted person";
  const isActive = activePair?.pairId === validPairId;

  const load = useCallback(async () => {
    if (!validPairId) return;
    setLoading(true);
    setError(null);
    try {
      const [status, deviceId] = await Promise.all([getCircle(validPairId), getDeviceId()]);
      setDevices(status.devices);
      setLocalDeviceId(deviceId);
    } catch (e) {
      setDevices(null);
      setError(
        e instanceof Error && e.message ? e.message : "We couldn't load this trusted circle.",
      );
    } finally {
      setLoading(false);
    }
  }, [validPairId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!parsed.success || !validPairId) {
    return (
      <PageShell title="Trusted person">
        <ErrorBox message="That connection ID is not valid." />
      </PageShell>
    );
  }

  const targetPairId = validPairId;

  function confirmRevoke(deviceId: string, deviceLabel: string) {
    Alert.alert(
      "Remove trust?",
      `${deviceLabel} will no longer be recognised automatically during your calls with ${name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove trust",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void revokeDevice({ pairId: targetPairId, targetDeviceId: deviceId })
              .then(() => load())
              .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "We couldn't remove that device."),
              )
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  function confirmRemoveLocally() {
    Alert.alert(`Remove ${name} from this phone?`, "Trust is removed from this phone only.", [
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
        <H2>Confirmed phones</H2>
        {loading ? (
          <Body muted>Loading…</Body>
        ) : devices === null ? (
          <ErrorBox message={error ?? "We couldn't load this trusted circle."} />
        ) : devices.length === 0 ? (
          <Body muted>No phone has confirmed this relationship yet.</Body>
        ) : (
          devices.map((device) => {
            const revoked = device.revokedAt !== null;
            const isThisDevice = device.deviceId === localDeviceId;
            const label = device.label ?? (isThisDevice ? "This phone" : "Another phone");
            return (
              <View key={device.deviceId} style={s.deviceRow}>
                <View style={s.deviceMain}>
                  <Body>{label}</Body>
                  <Text style={revoked ? s.revoked : s.deviceMeta}>
                    {revoked
                      ? "Trust removed"
                      : isThisDevice
                        ? "This phone"
                        : `Confirmed ${new Date(device.enrolledAt).toLocaleDateString()}`}
                  </Text>
                </View>
                {!revoked && !isThisDevice ? (
                  <Button
                    label="Remove"
                    variant="secondary"
                    onPress={() => confirmRevoke(device.deviceId, label)}
                    disabled={busy}
                  />
                ) : null}
              </View>
            );
          })
        )}
        {error && devices !== null ? <ErrorBox message={error} /> : null}
      </Card>

      <Card>
        <H2>Private detail</H2>
        <Body muted>
          Saved only on this phone, used only if Handshake ever needs to ask {name} a personal
          question.
        </Body>
        <PrivateDetailEditor
          pairId={validPairId}
          initialValue={pair?.privateContext ?? ""}
          onSave={(value) => updatePair(targetPairId, { privateContext: value })}
        />
      </Card>

      <Card>
        <H2>Manage person</H2>
        {!isActive ? (
          <Button
            label="Make default"
            variant="secondary"
            onPress={() => void setActive(validPairId)}
          />
        ) : null}
        <Button label={`Remove ${name} from this phone`} variant="danger" onPress={confirmRemoveLocally} />
      </Card>
    </PageShell>
  );
}

function PrivateDetailEditor({
  pairId,
  initialValue,
  onSave,
}: {
  pairId: string;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, pairId]);

  return (
    <View style={s.editorWrap}>
      <TextInput
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={2000}
        placeholder="Example: Our dog is called Rover"
        placeholderTextColor="#52525b"
        style={s.contextInput}
        textAlignVertical="top"
        accessibilityLabel="Private verification detail"
      />
      <Button
        label={saving ? "Saving…" : "Save private detail"}
        busy={saving}
        onPress={() => {
          setSaving(true);
          void onSave(value.trim()).finally(() => setSaving(false));
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  active: { color: colors.accent, fontWeight: "600", fontSize: 14 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  deviceMain: { flexShrink: 1, gap: 2 },
  deviceMeta: { color: colors.muted, fontSize: 13 },
  revoked: { color: colors.danger, fontSize: 13 },
  editorWrap: { maxHeight: 260 },
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