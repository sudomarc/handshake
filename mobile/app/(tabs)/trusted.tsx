import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { getCircle, relationState } from "@/lib/trust/api";
import { colors, MIN_TOUCH } from "@/lib/theme";

type RowState = "trusted" | "verify" | null;

/**
 * Pre-call trust management.
 *
 * Users add, review and revoke trusted people here — before the call. During
 * a call Handshake authenticates both devices automatically; nothing on this
 * screen asks the user to read or enter a code.
 */
export default function TrustLedger() {
  const router = useRouter();
  const { pairs, loading } = usePairs();
  const [states, setStates] = useState<Record<string, RowState>>({});

  const refreshStates = useCallback(async () => {
    const next: Record<string, RowState> = {};
    await Promise.all(
      pairs.map(async (p) => {
        try {
          const circle = await getCircle(p.pairId);
          next[p.pairId] = relationState(circle);
        } catch {
          next[p.pairId] = null;
        }
      }),
    );
    setStates(next);
  }, [pairs]);

  useEffect(() => {
    void refreshStates();
  }, [refreshStates]);

  return (
    <PageShell title="Trusted people">
      <Body muted>
        People you trust before a call. During a call, both phones confirm this
        relationship automatically — nothing is read out loud and no code is typed.
      </Body>

      {loading ? (
        <Body muted>Loading…</Body>
      ) : pairs.length === 0 ? (
        <Card>
          <Body>No trusted person yet.</Body>
        </Card>
      ) : (
        pairs.map((p) => {
          const state = states[p.pairId];
          const name = p.name ?? "Trusted person";
          return (
            <Pressable
              key={p.pairId}
              accessibilityRole="button"
              accessibilityLabel={`Manage trust with ${name}`}
              onPress={() =>
                router.push({ pathname: "/trusted/[id]", params: { id: p.pairId } })
              }
              style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}
            >
              <View style={s.rowMain}>
                <Text style={s.name}>{name}</Text>
                <Text style={state === "trusted" ? s.trustedState : s.verifyState}>
                  {state === "trusted" ? "Trusted" : state === "verify" ? "Verify" : "…"}
                </Text>
              </View>
              <Text style={s.chevron} accessibilityElementsHidden>
                ›
              </Text>
            </Pressable>
          );
        })
      )}

      <Button label="Add a trusted person" onPress={() => router.push("/pair")} />
    </PageShell>
  );
}

const s = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: "600" },
  trustedState: { color: colors.accent, fontWeight: "600", fontSize: 14 },
  verifyState: { color: colors.muted, fontWeight: "600", fontSize: 14 },
  chevron: { color: colors.muted, fontSize: 24, marginLeft: 12 },
});
