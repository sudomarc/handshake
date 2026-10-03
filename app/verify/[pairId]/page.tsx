import Link from "next/link";
import { CodeDisplay } from "@/components/CodeDisplay";
import { PageShell } from "@/components/PageShell";
import { VerifyForm } from "@/components/VerifyForm";
import { pairIdSchema } from "@/lib/schemas";

export default async function VerifyPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = await params;
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="Verify a call">
      {parsed.success ? (
        <>
          <CodeDisplay pairId={parsed.data} />
          <p className="text-lg leading-7 text-neutral-300">
            Ask the caller to say the code out loud. Compare it with the one above, or type what you
            heard.
          </p>
          <VerifyForm pairId={parsed.data} />
        </>
      ) : (
        <p className="text-lg leading-7 text-neutral-300">
          That pair code doesn&rsquo;t look right. Check it with the person you trust.
        </p>
      )}
      <Link
        href="/"
        className="text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
      >
        Back to start
      </Link>
    </PageShell>
  );
}
