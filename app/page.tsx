import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Choose someone you trust",
    text: "Create a private connection with a family member, partner, or friend.",
  },
  {
    number: "02",
    title: "Get a changing code",
    text: "Handshake generates a short code that changes every 30 seconds.",
  },
  {
    number: "03",
    title: "Verify before you act",
    text: "Ask the person for the current code. Match it before sending money or sensitive information.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white" aria-label="Handshake home">
          Handshake
        </Link>

        <Link
          href="/circle"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Get started
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-sky-400">
            Trust, when it matters
          </p>

          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
            Verify the person.
            <span className="block text-neutral-500">Not just the voice.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-neutral-400 sm:text-xl">
            Voice cloning can make a fake sound real. Handshake gives people a simple way to verify
            who they are before a trusted conversation turns into a scam.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/circle"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Protect your trusted circle
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 font-medium text-white transition hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/30 sm:mt-20 sm:p-6">
          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 sm:p-9">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Trusted connection</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Protected
              </span>
            </div>

            <div className="py-12 text-center sm:py-16">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
                Current code
              </p>
              <p className="mt-3 font-mono text-5xl font-bold tracking-[0.18em] text-white sm:text-7xl">
                537 378
              </p>
              <p className="mt-4 text-sm text-neutral-500">Changes every 30 seconds</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Identity</p>
                <p className="mt-2 font-medium text-white">Verified contact</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Trust</p>
                <p className="mt-2 font-medium text-white">Private connection</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Action</p>
                <p className="mt-2 font-medium text-white">Verify before acting</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-400">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A simple check before trust becomes a costly mistake.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-white/10 bg-neutral-950 p-6"
              >
                <span className="font-mono text-sm text-neutral-600">{step.number}</span>
                <h3 className="mt-8 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 leading-7 text-neutral-400">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-400">Built around trust</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The goal is not to guess. It is to verify.
            </h2>
          </div>
          <p className="leading-7 text-neutral-400">
            Handshake keeps verification simple: trusted people share a secret, and the proof changes
            over time. Other risk signals can help you slow down, but they do not replace human
            judgment.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-xl font-semibold text-white">Ready to protect your circle?</h3>
            <p className="mt-2 text-neutral-400">Set up your first trusted connection.</p>
          </div>
          <Link
            href="/circle"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 font-semibold text-neutral-950 transition hover:bg-neutral-200"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Handshake</p>
          <p>Verify the person. Not just the voice.</p>
        </div>
      </footer>
    </main>
  );
}
