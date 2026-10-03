import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function Home() {
  return (
    <PageShell title="Handshake">
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Handshake</h1>
          <p className="text-xl text-neutral-300 max-w-xs mx-auto">
            Verify the person.
            <br />
            Not just the voice.
          </p>
        </div>

        <p className="text-lg text-neutral-400 max-w-md mx-auto">
          When a caller sounds like someone you trust, use Handshake to check whether they can prove
          who they are.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-md mx-auto pt-4">
          <Link
            href="/circle"
            className="rounded-2xl bg-white p-6 text-center transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-2xl font-bold text-neutral-950">Verify a person</span>
            <span className="mt-2 block text-sm text-neutral-500">Check a call right now</span>
          </Link>

          <Link
            href="/circle"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-lg font-semibold text-neutral-50">My trusted people</span>
            <span className="mt-1 block text-sm text-neutral-400">
              Add or manage trusted contacts
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-2 w-full max-w-md mx-auto pt-8" aria-label="Other tools">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Other tools</p>
          <Link
            href="/analyze"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-base font-medium">Pressure Check</span>
            <span className="mt-1 block text-sm text-neutral-400">
              Spot pressure tactics in a message
            </span>
          </Link>
          <Link
            href="/challenge"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-base font-medium">Personal Question</span>
            <span className="mt-1 block text-sm text-neutral-400">
              Generate a question only the real person can answer
            </span>
          </Link>
          <Link
            href="/first-hour"
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-base font-medium">The First Hour</span>
            <span className="mt-1 block text-sm text-neutral-400">
              Calm steps if money has already moved
            </span>
          </Link>
        </nav>

        <p className="text-xs text-neutral-500 text-center pt-4">
          No accounts. No tracking. Just a shared secret between you and the person you trust.
        </p>
      </div>
    </PageShell>
  );
}
