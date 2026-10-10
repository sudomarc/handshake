"use client";

import { useState } from "react";

type StateId = "trusted" | "verify" | "risk";

interface StateCopy {
  id: StateId;
  name: string;
  summary: string;
  action: string;
  accent: string;
  border: string;
  surface: string;
  dot: string;
}

const STATES: readonly StateCopy[] = [
  {
    id: "trusted",
    name: "Trusted connection",
    summary:
      "Both phones confirmed the relationship and the backend verified the session between them.",
    action: "The required trust evidence was confirmed — you have a reason to carry on.",
    accent: "text-trusted",
    border: "border-trusted/35",
    surface: "bg-trusted/10",
    dot: "bg-trusted",
  },
  {
    id: "verify",
    name: "Verify",
    summary:
      "The other phone is offline, isn’t paired, or the backend can’t confirm the session right now.",
    action: "Don’t guess. Slow down and confirm another way before acting.",
    accent: "text-verify",
    border: "border-verify/35",
    surface: "bg-verify/10",
    dot: "bg-verify",
  },
  {
    id: "risk",
    name: "Risk detected",
    summary: "A real local risk signal flagged the interaction.",
    action: "Stop. Confirm with the person out of band before anything else.",
    accent: "text-risk",
    border: "border-risk/35",
    surface: "bg-risk/10",
    dot: "bg-risk",
  },
];

function Glyph({ id, className }: { id: StateId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (id === "trusted") {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    );
  }
  if (id === "verify") {
    return (
      <svg {...common}>
        <path d="M12 8v5" />
        <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
        <circle cx="12" cy="12" r="8.5" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 8v5.5" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
      <path d="M12 3.6L21 19.5H3z" opacity="0.65" />
    </svg>
  );
}

export function TrustStatesExplorer() {
  const [selected, setSelected] = useState<StateId>("trusted");
  const current = STATES.find((state) => state.id === selected) ?? STATES[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-12">
      <div>
        <div role="group" aria-label="Choose a trust state to preview">
          <div className="flex flex-col gap-3">
            {STATES.map((state) => {
              const active = state.id === selected;
              return (
                <button
                  key={state.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(state.id)}
                  className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                    active
                      ? `${state.border} ${state.surface}`
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${state.border} ${state.surface} ${state.accent}`}
                  >
                    <Glyph id={state.id} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 text-[0.98rem] font-semibold text-white">
                      <span className={`h-2 w-2 rounded-full ${state.dot}`} aria-hidden="true" />
                      {state.name}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-neutral-400">
                      {state.summary}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-neutral-400">
          Interactive illustration of the app’s overlay. It shows how each state is presented — it
          is not a live call and not real-time detection.
        </p>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <div className="panel-hi overflow-hidden p-5 shadow-2xl shadow-black/50 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
              Handshake overlay
            </span>
            <span className="font-mono text-[0.7rem] text-neutral-400">illustration</span>
          </div>

          <div className={`mt-5 rounded-2xl border ${current.border} ${current.surface} p-5`}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${current.border} bg-black/20 ${current.accent}`}
              >
                <Glyph id={current.id} className="h-5 w-5" />
              </span>
              <div>
                <p className={`text-base font-semibold ${current.accent}`}>{current.name}</p>
                <p className="text-xs text-neutral-400">
                  {current.id === "trusted"
                    ? "Paired device · backend-verified session"
                    : current.id === "verify"
                      ? "Evidence incomplete"
                      : "Local risk signal"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-300">{current.action}</p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-xs">
              <span className="text-neutral-400">Identity</span>
              <span className="text-neutral-300">
                {current.id === "trusted" ? "Paired phone" : "Not established"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-xs">
              <span className="text-neutral-400">Shown when</span>
              <span className="text-right text-neutral-300">
                {current.id === "trusted"
                  ? "Both phones confirmed + session verified"
                  : current.id === "verify"
                    ? "Peer offline / not paired / backend unreachable"
                    : "A real local risk signal fired"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {`Selected state: ${current.name}. ${current.summary} ${current.action}`}
      </p>
    </div>
  );
}
