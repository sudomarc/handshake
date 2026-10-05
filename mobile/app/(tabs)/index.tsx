import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, H2 } from "@/components/ui";
import { usePairs } from "@/hooks/usePairs";
import { colors } from "@/lib/theme";

export default function Home() {
  const router = useRouter();
  const { activePair } = usePairs();

  return (
    <PageShell title="Handshake">
      <Text style={s.hero}>Verify the person. Not just the voice.</Text>
      <Body muted>
        A voice can be cloned. When a caller sounds like someone you trust, ask for the live code
        only the two of you share.
      </Body>

      <Button
        label="Verify a person"
        onPress={() =>
          activePair
            ? router.push({ pathname: "/verify/[pairId]", params: { pairId: activePair.pairId } })
            : router.push("/trusted")
        }
      />
      {!activePair ? <Body muted>Add a trusted person first.</Body> : null}
      {activePair ? (
        <Button
          label={`Show my code${activePair.name ? ` for ${activePair.name}` : ""}`}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/codes/[pairId]", params: { pairId: activePair.pairId } })
          }
        />
      ) : null}

      <Card>
        <H2>More tools</H2>
        <Button
          label="Pressure check"
          variant="secondary"
          onPress={() => router.push("/analyze")}
        />
        <Button
          label="Personal question"
          variant="secondary"
          disabled={!activePair}
          onPress={() =>
            activePair &&
            router.push({ pathname: "/challenge/[pairId]", params: { pairId: activePair.pairId } })
          }
        />
        <Button
          label="The first hour"
          variant="secondary"
          onPress={() => router.push("/first-hour")}
        />
        <Button
          label="Call Audio Feasibility"
          variant="secondary"
          onPress={() => router.push("/call-audio-feasibility")}
        />
        <Button
          label="Call Protection"
          variant="secondary"
          onPress={() => router.push("/call/protection")}
        />
      </Card>
    </PageShell>
  );
}

const s = StyleSheet.create({
  hero: { color: colors.text, fontSize: 34, fontWeight: "700", lineHeight: 40 },
});
