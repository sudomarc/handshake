import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CreatePairForm } from "@/components/CreatePairForm";
import { PageShell } from "@/components/PageShell";
import { Body, Card } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { colors, MIN_TOUCH } from "@/lib/theme";

/**
 * Pre-call trust management.
 *
 * Users add, review and revoke trusted people here — before the call. During a
 * call Handshake authenticates both devices automatically; nothing on this
 * screen asks the user to read or enter a code.
 */
export default function TrustLedger() {
  const router = useRouter();
  const { pairs, activePair, loading, refresh } = usePairs();

  return (
    <PageShell title="Trusted people">
      <Body muted>
        People you trust before a call. During a call, both phones confirm this relationship
        automatically — nothing is read out loud and no code is typed.
      </Body>

      {loading ? (
        <Body muted>Loading…</Body>
      ) : pairs.length === 0 ? (
        <Card>
          <Body>No trusted person yet. Add one below.</Body>
        </Card>
      ) : (
        pairs.map((p) => {
          const isActive = activePair?.pairId === p.pairId;
          const name = p.name ?? "Trusted person";
          return (
            <Pressable
              key={p.pairId}
              accessibilityRole="button"
              accessibilityLabel={`Manage trust with ${name}`}
              onPress={() =>
                router.push({ pathname: "/trusted/[pairId]", params: { pairId: p.pairId } })
              }
              style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}
            >
              <View style={s.rowMain}>
                <Text style={s.name}>{name}</Text>
                {isActive ? <Text style={s.active}>Default</Text> : null}
              </View>
              <Text style={s.chevron} accessibilityElementsHidden>
                ›
              </Text>
            </Pressable>
          );
        })
      )}

      <CreatePairForm onChanged={() => void refresh()} />
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
  active: { color: colors.accent, fontWeight: "600", fontSize: 14 },
  chevron: { color: colors.muted, fontSize: 24, marginLeft: 12 },
});