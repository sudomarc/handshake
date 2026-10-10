import type { ReactNode } from "react";

/* Icons for the three pairing steps (inline SVG, stroke-based). */

function IconPerson() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function IconPair() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="7" height="14" rx="2" />
      <rect x="14.5" y="5" width="7" height="14" rx="2" />
      <path d="M6 12h12" opacity="0.6" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.8" opacity="0.55" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 12l4.6-3.1" opacity="0.8" />
    </svg>
  );
}

interface Step {
  number: string;
  title: string;
  text: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Add a trusted person",
    text: "In the Handshake app, choose someone you know in real life — a parent, partner, sibling, or close friend.",
    icon: <IconPerson />,
  },
  {
    number: "02",
    title: "Pair the phones",
    text: "Tap “Show my QR” on one phone and “Scan a QR” on the other. The invitation is short-lived and single-use — and both of you confirm on your own phone. The trust is mutual.",
    icon: <IconPair />,
  },
  {
    number: "03",
    title: "Recognize the device",
    text: "When one of you calls the other, the paired phone is recognized through the trust backend. The app shows one honest state: Trusted connection, Verify, or Risk detected.",
    icon: <IconRadar />,
  },
];

/** Illustrated rail for the three pairing steps. */
export function PairingDiagram() {
  return (
    <div className="relative">
      {/* Connecting rail on medium+ screens */}
      <div
        aria-hidden="true"
        className="absolute left-[12%] right-[12%] top-7 hidden border-t border-dashed border-white/15 md:block"
      />
      <ol className="relative grid gap-5 md:grid-cols-3 md:gap-6">
        {STEPS.map((step) => (
          <li key={step.number} className="panel-hi flex flex-col p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sky-300">
                {step.icon}
              </span>
              <span className="font-mono text-sm text-neutral-400">{step.number}</span>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
            <p className="mt-3 text-[0.95rem] leading-7 text-neutral-400">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center font-mono text-xs tracking-wide text-neutral-400">
        Pairing happens in the Handshake app, on two phones side by side — not on this website.
      </p>
    </div>
  );
}
