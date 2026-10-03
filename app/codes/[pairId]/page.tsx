import Link from "next/link";
import { CodeDisplay } from "@/components/CodeDisplay";
import { PageShell } from "@/components/PageShell";
import { pairIdSchema } from "@/lib/schemas";

export default async function CodesPage({ params }: { params: Promise<{ pairId: string }> }) {
  const { pairId } = await params;
  const parsed = pairIdSchema.safeParse(pairId);

  return (
    <PageShell title="My codes">
      {parsed.success ? (
        <>
          <CodeDisplay pairId={parsed.data} />
          <p className="text-lg leading-7 text-neutral-300">
            This is the code you read aloud to the person on the other end — only when they already
            trust the call.
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
