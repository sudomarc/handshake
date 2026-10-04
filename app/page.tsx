import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function Home() {
  return (
    <PageShell title="Handshake">
      <div className="section animate-in">
        {/* Hero */}
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            Live verification
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-50">
            Verify the person.
            <br />
            <span className="text-gradient">Not just the voice.</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-md mx-auto text-balance">
            When a caller sounds like someone you trust, use Handshake to check whether they can
            prove who they are.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="space-y-4">
          <Link href="/verify" className="btn-primary btn-lg btn-block group">
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Verify a person</span>
          </Link>

          <p className="text-sm text-neutral-500 text-center">Check a call right now</p>
        </div>

        {/* Secondary CTA */}
        <div className="divider my-4" />

        <Link href="/circle" className="btn-secondary btn-block group">
          <svg
            className="h-5 w-5 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <span className="flex items-center justify-center gap-2">
            <span>My trusted people</span>
          </span>
        </Link>
        <p className="text-sm text-neutral-500 text-center">Add or manage trusted contacts</p>

        {/* Secondary tools */}
        <div className="divider my-4" />

        <nav className="space-y-2" aria-label="Other tools">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Other tools</p>

          <Link href="/analyze" className="card-interactive p-4 flex items-center gap-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg
                className="h-5 w-5 text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-neutral-50">Pressure Check</span>
              <span className="block text-sm text-neutral-500 mt-0.5">
                Spot pressure tactics in a message
              </span>
            </div>
            <svg
              className="h-5 w-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link href="/challenge" className="card-interactive p-4 flex items-center gap-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-neutral-50">Personal Question</span>
              <span className="block text-sm text-neutral-500 mt-0.5">
                Generate a question only the real person can answer
              </span>
            </div>
            <svg
              className="h-5 w-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link href="/first-hour" className="card-interactive p-4 flex items-center gap-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-neutral-50">The First Hour</span>
              <span className="block text-sm text-neutral-500 mt-0.5">
                Calm steps if money has already moved
              </span>
            </div>
            <svg
              className="h-5 w-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link href="/demo" className="card-interactive p-4 flex items-center gap-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg
                className="h-5 w-5 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l4 4-4 4"
                />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-neutral-50">Demo Mode</span>
              <span className="block text-sm text-neutral-500 mt-0.5">
                Test verification with two devices
              </span>
            </div>
            <svg
              className="h-5 w-5 text-neutral-600 group-hover:text-neutral-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </nav>

        {/* Footer note */}
        <p className="text-xs text-neutral-500 text-center pt-4">
          No accounts. No tracking. Just a shared secret between you and the person you trust.
        </p>
      </div>
    </PageShell>
  );
}
