import Link from "next/link";
import { CodeDisplay } from "@/components/CodeDisplay";
import { PageShell } from "@/components/PageShell";
import { pairIdSchema } from "@/lib/schemas";

export default async function CodesPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = await params;
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="My code">
      {parsed.success ? (
        <>
          <div className="space-y-8">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-center">
              <p className="text-lg leading-7 text-neutral-300">
                Read this code to the person on the other end.
              </p>
            </div>
            <CodeDisplay pairId={parsed.data} isCaller />
            <p className="text-center text-neutral-400 text-lg">
              Only share this with the person you trust.
            </p>
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
