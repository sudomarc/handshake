import { PageShell } from "@/components/PageShell";

export default function AnalyzePage() {
  return (
    <PageShell title="Pressure check">
      <p className="text-lg leading-7 text-neutral-300">
        Paste what the caller said — a transcript or a message — and see which pressure tactics are
        in it: urgency, secrecy, “pay now”, authority.
      </p>
      <div className="rounded-2xl border border-dashed border-neutral-700 p-6 text-center text-neutral-400">
        The check is under construction.
      </div>
    </PageShell>
  );
}
