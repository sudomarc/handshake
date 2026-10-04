import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Body, Button, Card, ErrorBox, H2 } from "@/components/ui";
import { api } from "@/lib/api";
import { pairIdSchema, type ChallengeResponse } from "@/lib/apiTypes";

export default function ChallengeScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const parsed = pairIdSchema.safeParse(pairId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeResponse | null>(null);

  async function generate() {
    if (!parsed.success) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.generateChallenge(parsed.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a question.");
    } finally {
      setBusy(false);
    }
  }

  if (!parsed.success) {
    return (
      <PageShell title="Personal question">
        <ErrorBox message="Invalid pair code." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Personal question">
      <Body muted>Ask something only the real person could answer.</Body>
      <Button
        label={result ? "Another question" : "Get a question"}
        onPress={generate}
        busy={busy}
      />
      {error ? <ErrorBox message={error} /> : null}
      {result ? (
        <Card>
          <H2>{result.challenge}</H2>
          <Body muted>
            {result.category} · {result.difficulty}
          </Body>
        </Card>
      ) : null}
    </PageShell>
  );
}
