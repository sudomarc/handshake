import { useLocalSearchParams } from "expo-router";
import { PageShell } from "@/components/PageShell";
import { VerifyForm } from "@/components/VerifyForm";
import { Body, Card, ErrorBox } from "@/components/ui";
import { pairIdSchema } from "@/lib/apiTypes";

export default function VerifyScreen() {
  const { pairId } = useLocalSearchParams<{ pairId: string }>();
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="Verify a call">
      {parsed.success ? (
        <>
          <Card>
            <Body>Ask the caller to say the 6 digits out loud, then type what you heard.</Body>
          </Card>
          <VerifyForm pairId={parsed.data} />
        </>
      ) : (
        <ErrorBox message="Invalid pair code." />
      )}
    </PageShell>
  );
}
