import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Handshake — Know who's really on the line.",
  description:
    "Voice cloning can make a fake sound real. Handshake pairs the phones of people you trust, then recognizes them automatically during calls — with an honest Trusted / Verify / Risk detected overlay.",
  openGraph: {
    title: "Handshake",
    description: "Know who's really on the line. No codes to read or type.",
    type: "website",
  },
};

const steps = [
  {
    number: "01",
    title: "Add a trusted person",
    text: "In the Handshake app, choose someone you trust in real life — a parent, partner, sibling, or close friend.",
  },
  {
    number: "02",
    title: "Put two phones together",
    text: "Tap \"Show my QR\" on one phone and \"Scan a QR\" on the other. The invitation is short-lived and single-use. Both people confirm on their own phone — the trust is mutual.",
  },
  {
    number: "03",
    title: "Recognized during every call",
    text: "When one of you calls the other, Handshake automatically recognizes the paired phone and shows one honest state instead of guessing.",
  },
];

const states = [
  {
    name: "Trusted connection",
    dot: "bg-emerald-400",
    text: "Both phones confirmed the relationship and the backend verified the session. Carry on.",
  },
  {
    name: "Verify",
    dot: "bg-amber-400",
    text: "The other phone is offline, isn't paired, or the backend is unreachable. Slow down and confirm another way.",
  },
  {
    name: "Risk detected",
    dot: "bg-red-400",
    text: "A real local risk signal flagged the interaction. Stop and confirm out-of-band before acting.",
  },
];

function Mark() {
  return (
    <svg
      className="h-7 w-7 text-sky-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 12.5l2.5 2.5L17 8.5" />
      <path d="M20.9 13.3A9 9 0 1 1 12 3a9 9 0 0 1 8.9 10.3z" opacity="0.4" />
    </svg>
  );
}

function OverlayPreview() {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-neutral-950 p-6 sm:p-9"
      aria-label="What the Handshake overlay looks like during a call"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">Overlay during a call — product preview</span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Trusted connection
        </span>
      </div>

      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">Handshake · Trusted connection</p>
            <p className="text-xs text-neutral-500">This phone was paired and confirmed by both of you.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Identity</p>
          <p className="mt-2 font-medium text-white">Paired device</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">Trust</p>
          <p className="mt-2 font-medium text-white">Mutual confirmation</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-neutral-500">State</p>
          <p className="mt-2 font-medium text-white">Trusted / Verify / Risk</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
          aria-label="Handshake home"
        >
          <Mark />
          Handshake
        </Link>

        <Link
          href="/circle"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          How pairing works
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-sky-400">
            Trust, when it matters
          </p>

          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
            Know who&rsquo;s really
            <span className="block text-neutral-500">on the line.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-neutral-400 sm:text-xl">
            Voice cloning can make a fake sound real. Handshake pairs the phones of the people you
            trust — once, in person, with a QR scan — then recognizes them automatically during
            calls. No codes to read or type.
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
          <OverlayPreview />
        </div>
      </section>

      <section aria-labelledby="states-heading" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-400">One state, at a time</p>
          <h2
            id="states-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            During any call, Handshake shows one of three states.
          </h2>
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {states.map((state) => (
            <li key={state.name} className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${state.dot}`} aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold text-white">{state.name}</h3>
              <p className="mt-3 leading-7 text-neutral-400">{state.text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm leading-6 text-neutral-500">
          Handshake never shows &ldquo;Protected&rdquo; without evidence. It only shows a trusted
          connection after both phones have confirmed the relationship and the backend verified the
          session. Risk detected requires a real local risk signal.
        </p>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-400">How it works</p>
            <h2
              id="how-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Trust is built once, then recognized automatically.
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
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-400">Where pairing happens</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The QR lives in the mobile app.
            </h2>
          </div>
          <p className="leading-7 text-neutral-400">
            This page explains the model. The actual pairing — showing and scanning the
            short-lived QR, then confirming on both phones — happens in the Handshake app on two
            phones side by side. The web app is a companion that describes what your circle looks
            like after pairing.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-xl font-semibold text-white">Ready to protect your circle?</h3>
            <p className="mt-2 text-neutral-400">
              Learn how pairing works, then grab two phones to set up your first trusted connection.
            </p>
          </div>
          <Link
            href="/circle"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 font-semibold text-neutral-950 transition hover:bg-neutral-200"
          >
            How pairing works
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Handshake</p>
          <p>Know who&rsquo;s really on the line.</p>
        </div>
      </footer>
    </main>
  );
}