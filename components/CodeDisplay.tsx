"use client";

import { useLiveCode } from "./useLiveCode";

export function CodeDisplay({ pairId, isCaller = false }: { pairId: string; isCaller?: boolean }) {
  const live = useLiveCode(pairId);

  if (live.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-red-900 bg-red-950 p-4 text-red-200 text-center"
      >
        {live.message}
      </p>
    );
  }

  const ready = live.status === "ready";
  const digits = ready ? `${live.code.slice(0, 3)} ${live.code.slice(3)}` : "••• •••";
  const secondsLeft = ready ? live.secondsLeft : 30;
  const codeSize = isCaller ? "text-9xl" : "text-7xl";

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        className={`${codeSize} font-bold tabular-nums tracking-[0.2em] font-mono`}
        aria-label={ready ? `Current code ${live.code.split("").join(" ")}` : "Loading the code"}
      >
        {digits}
      </div>
      <div
        className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-neutral-800"
        role="progressbar"
        aria-label="Time before the code changes"
        aria-valuemin={0}
        aria-valuemax={30}
        aria-valuenow={secondsLeft}
      >
        <div
          className="h-full rounded-full bg-white transition-[width] duration-500 ease-linear"
          style={{ width: `${(secondsLeft / 30) * 100}%` }}
        />
      </div>
      <p className="text-lg text-neutral-400 text-center">
        {ready ? `Changes in ${secondsLeft} s` : "Loading the code…"}
      </p>
    </div>
  );
}
