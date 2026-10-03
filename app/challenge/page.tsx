import { PageShell } from "@/components/PageShell";

export default function ChallengePage() {
  return (
    <PageShell title="Personal question">
      <p className="text-lg leading-7 text-neutral-300">
        Save a few private details in advance — a nickname, a shared memory — and we&rsquo;ll ask a
        question only you could answer.
      </p>
      <div className="rounded-2xl border border-dashed border-neutral-700 p-6 text-center text-neutral-400">
        The personal question is under construction.
      </div>
    </PageShell>
  );
}
