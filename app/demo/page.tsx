import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const flowSteps = [
  {
    step: 1,
    title: "Add a trusted person (Phone A)",
    text: "Open Handshake on the first phone, tap \u201CAdd a trusted person\u201D, then \u201CShow my QR\u201D. A short-lived, single-use QR invitation appears on screen.",
  },
  {
    step: 2,
    title: "Scan the QR (Phone B)",
    text: "On the second phone, tap \u201CScan a QR\u201D and point it at the first screen. The invitation is consumed — it cannot be reused.",
  },
  {
    step: 3,
    title: "Both people confirm",
    text: "Each person confirms on their own phone. The relationship is mutual: both phones are now paired, and the backend records both enrollments.",
  },
  {
    step: 4,
    title: "A call is recognized automatically",
    text: "When one of you calls the other, Handshake opens a trust session between the two paired devices. The overlay shows one honest state: Trusted connection, Verify, or Risk detected.",
  },
];

const states = [
  { name: "Trusted connection", dot: "bg-emerald-500", text: "Mutual confirmation, backend-verified session." },
  { name: "Verify", dot: "bg-amber-500", text: "Peer offline, not paired, or backend unreachable." },
  { name: "Risk detected", dot: "bg-red-500", text: "A real local risk signal flagged the interaction." },
];

export default function DemoPage() {
  return (
    <PageShell title="Pairing demo">
      <div className="section animate-in space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l4 4-4 4"
              />
            </svg>
            Pairing demo
          </div>
          <p className="text-lg text-neutral-300 text-center max-w-xl mx-auto">
            This is the current demo flow: two phones, side by side. One shows a QR, the other
            scans it, both people confirm — then a call between the two is recognized automatically.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {flowSteps.map((item) => (
            <article key={item.step} className="card p-5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/10 text-purple-300 text-sm font-bold">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-neutral-50">{item.title}</h3>
              <p className="mt-2 leading-7 text-neutral-400">{item.text}</p>
            </article>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-neutral-50 mb-3">The three overlay states</h3>
          <ul className="space-y-3">
            {states.map((state) => (
              <li key={state.name} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${state.dot}`} aria-hidden="true" />
                <div>
                  <p className="font-medium text-neutral-50">{state.name}</p>
                  <p className="text-sm leading-6 text-neutral-400">{state.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="font-medium text-amber-300">Honest note</p>
          <p className="mt-1 text-sm leading-6 text-amber-200/80">
            This web page cannot run a live QR scan — it is a flow description. The pairing demo
            runs on two Android phones with the Handshake app installed, against the deployed
            backend. Results shown in the demo are the states actually observed on those devices.
          </p>
        </div>

        <p className="text-center">
          <Link href="/circle" className="btn-primary btn-lg btn-block sm:inline-flex sm:w-auto">
            How pairing works
          </Link>
        </p>
      </div>
    </PageShell>
  );
}