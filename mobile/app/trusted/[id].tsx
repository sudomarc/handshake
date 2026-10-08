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
 * Simple and nontechnical: the person's name, the relationship state, the
 * phones that are enrolled, and ways to remove trust. Trust is established
 * automatically during calls — nothing is read aloud, typed, or shared here.
 */
export default function TrustedPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const parsed = pairIdSchema.safeParse(id);
  const { pairs, removePair, updatePair } = usePairs();

  const [devices, setDevices] = useState<CircleDevice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localDeviceId, setLocalDeviceId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState("");

  const validId = parsed.success ? parsed.data : null;
  const pair = validId ? pairs.find((p) => p.pairId === validId) : undefined;
  const name = pair?.name ?? "Trusted person";

  const load = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    setError(null);
    try {
      const [status, deviceId] = await Promise.all([getCircle(validId), getDeviceId()]);
      setDevices(status.devices);
      setLocalDeviceId(deviceId);
    } catch {
      setDevices(null);
      setError("Could not load this trusted circle. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [validId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!parsed.success || !validId) {
    return (
      <PageShell title="Trusted person">
        <ErrorBox message="That trusted person is not valid." />
      </PageShell>
    );
  }

  // Narrowed once more because function declarations below are hoisted and do
  // not inherit TypeScript's narrowing from the early return above.
  const targetId: string = validId;

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
            void revokeDevice({ pairId: targetId, targetDeviceId: deviceId })
              .then(() => load())
              .catch(() => setError("We couldn't remove that device."))
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
          void removePair(targetId).then(() => router.back());
        },
      },
    ]);
  }

  async function saveName() {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== name) {
      await updatePair(targetId, { name: trimmed });
    }
    setEditing(false);
  }

  return (
    <PageShell title="Trusted person">
      <View style={s.identity}>
        {editing ? (
          <View style={s.nameEdit}>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              placeholder={name}
              placeholderTextColor="#52525b"
              style={s.nameInput}
              autoFocus
              maxLength={40}
            />
            <Button label="Save" variant="secondary" onPress={() => void saveName()} />
          </View>
        ) : (
          <>
            <H2>{name}</H2>
            <Button
              label="Rename"
              variant="secondary"
              onPress={() => {
                setEditedName(name);
                setEditing(true);
              }}
            />
          </>
        )}
      </View>

      <Card>
        <H2>Automatic trust</H2>
        <Body muted>
          During a call between you and {name}, both phones confirm this trusted relationship
          automatically. Nothing is read out loud and no code is typed.
        </Body>
        <Body muted>
          Handshake can confirm the relationship, but it cannot hear the call on an ordinary
          phone call or inside another calling app.
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
        <H2>Manage person</H2>
        <Button label={`Remove ${name}`} variant="danger" onPress={confirmRemoveLocally} />
      </Card>
    </PageShell>
  );
}

const s = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameEdit: { flex: 1, gap: 8 },
  nameInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
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
});
