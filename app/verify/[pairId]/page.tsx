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
          <div className="space-y-6">
            <CodeDisplay pairId={parsed.data} />
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-lg leading-7 text-neutral-300 text-center">
                Ask the caller to say the 6 digits out loud.
              </p>
            </div>
            <VerifyForm pairId={parsed.data} />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <p className="text-lg leading-7 text-neutral-300 text-center">
            That code doesn&rsquo;t look right. Check it with the person you trust.
          </p>
          <Link
            href="/"
            className="inline-block rounded-2xl bg-white/10 px-6 py-3 font-medium text-neutral-50 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Back to start
          </Link>
        </div>
      )}
    </PageShell>
  );
}
