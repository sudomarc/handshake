import { CreatePairForm } from "@/components/CreatePairForm";
import { PageShell } from "@/components/PageShell";

export default function CirclePage() {
  return (
    <PageShell title="My trusted people">
      <div className="section animate-in">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-50">My trusted people</h2>
              <p className="text-sm text-neutral-500">People you trust to verify calls with</p>
            </div>
          </div>

          <p className="text-neutral-300 leading-7">
            A trusted person is someone you know in real life — a parent, sibling, partner, or close
            friend. You each get a private code that changes every 30 seconds. Only the two of you
            can see it.
          </p>
        </div>

        <CreatePairForm />
      </div>
    </PageShell>
  );
}
