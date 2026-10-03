import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { pairIdSchema } from "@/lib/schemas";

export default async function VerifyPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = await params;
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="Verify a call">
      {parsed.success ? (
        <>
          <div className="flex flex-col items-center gap-3 py-6" aria-live="polite">
            <div className="text-7xl font-bold tabular-nums tracking-[0.25em]">••••••</div>
            <p className="text-lg text-neutral-400">The live code appears here.</p>
          </div>
          <p className="text-lg leading-7 text-neutral-300">
            Ask the caller to say the code. If they can, it&rsquo;s the real person.
          </p>
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
