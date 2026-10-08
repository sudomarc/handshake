import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const pairs = [
  {
    title: "One phone shows",
    text: "Tap \u201CAdd a trusted person\u201D then \u201CShow my QR\u201D. Handshake shows a short-lived, single-use QR invitation on screen.",
  },
  {
    title: "The other phone scans",
    text: "Tap \u201CScan a QR\u201D on the second phone and point it at the first. No code to type, nothing to read out loud.",
  },
  {
    title: "Both people confirm",
    text: "Each person confirms on their own phone. The trusted relationship is mutual \u2014 you are added to their circle at the same time they are added to yours.",
  },
];

const callStates = [
  {
    name: "Trusted connection",
    dot: "bg-emerald-500",
    text: "Both phones confirmed the relationship and the backend verified the session.",
  },
  {
    name: "Verify",
    dot: "bg-amber-500",
    text: "The peer is offline, isn't paired, or the backend is unreachable.",
  },
  {
    name: "Risk detected",
    dot: "bg-red-500",
    text: "A real local risk signal flagged the interaction.",
  },
];

export default function CirclePage() {
  return (
    <PageShell title="My trusted people">
      <div className="section animate-in space-y-6">
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
              <p className="text-sm text-neutral-500">
                People whose paired phones Handshake recognizes during calls
              </p>
            </div>
          </div>

          <p className="text-neutral-300 leading-7">
            A trusted person is someone you know in real life — a parent, sibling, partner, or close
            friend. Pairing happens in the Handshake mobile app by putting two phones together: one
            shows a short-lived QR, the other scans it, and both people confirm. There is no code to
            type or read out loud, and no connection ID to share.
          </p>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
            <p className="font-medium text-sky-300">Pairing runs on your phones</p>
            <p className="mt-1 text-sm leading-6 text-sky-200/80">
              This page is a companion. The QR scan and confirmation flow live in the Handshake
              Android app — open it on two phones, side by side, to pair.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {pairs.map((step, i) => (
            <article key={step.title} className="card p-5">
              <span className="font-mono text-sm text-neutral-600">0{i+1}</span>
              <h3 className="mt-4 text-lg font-semibold text-neutral-50">{step.title}</h3>
              <p className="mt-2 leading-7 text-neutral-400">{step.text}</p>
            </article>
          ))}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-neutral-50">
            What shows on screen during a call
          </h3>
          <ul className="mt-4 space-y-3">
            {callStates.map((state) => (
              <li key={state.name} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${state.dot}`} aria-hidden="true" />
                <div>
                  <p className="font-medium text-neutral-50">{state.name}</p>
                  <p className="text-sm leading-6 text-neutral-400">{state.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-neutral-500">
            Handshake never shows &ldquo;Protected&rdquo; without evidence: a trusted connection
            requires both phones to have confirmed the relationship and the backend to have verified
            the session.
          </p>
        </div>

        <p className="text-center">
          <Link href="/" className="btn-secondary">
            ← Back to start
          </Link>
        </p>
      </div>
    </PageShell>
  );
}