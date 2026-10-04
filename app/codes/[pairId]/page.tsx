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
        <div className="section animate-in space-y-6">
          {/* Header instruction */}
          <div className="card p-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400 mb-3">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Your code
            </div>
            <p className="text-lg leading-7 text-neutral-300">
              Read this code to the person on the other end.
            </p>
          </div>

          {/* Code display - larger for caller */}
          <CodeDisplay pairId={parsed.data} isCaller />

          <p className="text-center text-neutral-500 text-lg">
            Only share this with the person you trust.
          </p>

          <Link href="/" className="btn-secondary btn-block mt-4">
            Back to start
          </Link>
        </div>
      ) : (
        <div className="section animate-in space-y-6 text-center">
          <div className="card p-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c.867 0 1.542-.565.906-1.542l-2.982-5.964A2 2 0 0015.196 3H8.804a2 2 0 00-1.906 1.542L3.194 17.964A2 2 0 005.106 21h13.802a2 2 0 001.906-1.542L20.806 12H4.194z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-50 mb-2">Invalid pair code</h2>
            <p className="text-neutral-400 mb-6">
              That code doesn&rsquo;t look right. Check it with the person you trust.
            </p>
            <Link href="/" className="btn-secondary btn-block">
              Back to start
            </Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}
