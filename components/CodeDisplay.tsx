"use client";

import { useLiveCode } from "./useLiveCode";

export function CodeDisplay({ pairId }: { pairId: string }) {
  const live = useLiveCode(pairId);

  if (live.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-red-900 bg-red-950 p-4 text-red-200">
        {live.message}
      </p>
    );
  }

  const ready = live.status === "ready";
  const digits = ready ? `${live.code.slice(0, 3)} ${live.code.slice(3)}` : "••• •••";
  const secondsLeft = ready ? live.secondsLeft : 30;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        className="text-7xl font-bold tabular-nums tracking-[0.15em]"
        aria-label={ready ? `Current code ${live.code.split("").join(" ")}` : "Loading the code"}
      >
        {digits}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-800"
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
      <p className="text-lg text-neutral-400">
        {ready ? `Changes in ${secondsLeft} s` : "Loading the code…"}
      </p>
    </div>
  );
}
