import { useLocalSearchParams } from "expo-router";
import { CodeDisplay } from "@/components/CodeDisplay";
import { PageShell } from "@/components/PageShell";
import { Body, Card, ErrorBox } from "@/components/ui";
import { pairIdSchema } from "@/lib/apiTypes";

export default function CodesScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="My code">
      {parsed.success ? (
        <>
          <Card>
            <Body>
              Read these 6 digits aloud when your trusted person asks. Never send them by text.
            </Body>
          </Card>
          <CodeDisplay pairId={parsed.data} />
        </>
      ) : (
        <ErrorBox message="Invalid pair code." />
      )}
    </PageShell>
  );
}
