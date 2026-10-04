import { useLiveCode } from "@/hooks/useLiveCode";

interface CodeDisplayProps {
  pairId: string;
  isCaller?: boolean;
}

export function CodeDisplay({ pairId, isCaller = false }: CodeDisplayProps) {
  const live = useLiveCode(pairId);

  if (live.status === "error") {
    return (
      <div className="card p-6 text-center" role="alert">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c.867 0 1.542-.565.906-1.542l-2.982-5.964A2 2 0 0015.196 3H8.804a2 2 0 00-1.906 1.542L3.194 17.964A2 2 0 005.106 21h13.802a2 2 0 001.906-1.542L20.806 12H4.194z"
            />
          </svg>
        </div>
        <p className="text-red-300">{live.error}</p>
      </div>
    );
  }

  const ready = live.status === "ready";
  const digits = ready ? `${live.code.slice(0, 3)} ${live.code.slice(3)}` : "••• •••";
  const secondsLeft = ready ? live.secondsRemaining : 30;

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div
        className="text-9xl sm:text-[clamp(5rem,15vw,7rem)] font-bold tabular-nums tracking-[0.25em] font-mono text-neutral-50 select-none"
        aria-label={ready ? `Current code ${live.code.split("").join(" ")}` : "Loading the code"}
        aria-live={ready ? "polite" : "off"}
      >
        <span className="inline-block animate-in">
          {live.code.slice(0, 3)} {live.code.slice(3)}
        </span>
      </div>

      <div
        className="h-4 w-full max-w-md overflow-hidden rounded-full bg-neutral-800 relative"
        role="progressbar"
        aria-label="Time before the code changes"
        aria-valuemin={0}
        aria-valuemax={30}
        aria-valuenow={secondsLeft}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-[width] duration-500 ease-linear"
          style={{ width: `${(secondsLeft / 30) * 100}%` }}
        />
        {ready && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-white animate-pulse-ring"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-neutral-400">
        <span className="text-sm font-mono tabular-nums">{secondsLeft}</span>
        <span className="text-sm">{ready ? "s left" : "Loading…"}</span>
      </div>
    </div>
  );
}
