/** A static, responsive illustration of the kind of trust decision Handshake is designed to surface. */
export function HeroSceneSlot() {
  return (
    <div
      className="relative mx-auto w-full max-w-[35rem]"
      role="img"
      aria-label="Illustration of an incoming call marked Verify because the trusted device could not be confirmed, with guidance to pause and call back using a saved number."
    >
      <div
        className="pointer-events-none absolute inset-x-[12%] top-[12%] h-[70%] rounded-full bg-sky-500/[0.13] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.11] bg-[#0d1016]/95 p-4 shadow-[0_35px_90px_-35px_rgba(56,189,248,0.2)] backdrop-blur sm:rounded-[2rem] sm:p-6"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/[0.08]">
              <span className="absolute left-[9px] h-4 w-2.5 rounded-[4px] border border-sky-200/80" />
              <span className="absolute right-[9px] h-4 w-2.5 rounded-[4px] border border-sky-200/80" />
              <span className="h-1 w-1 rounded-full bg-sky-200" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">Handshake</p>
              <p className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-neutral-500">
                Session check
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-neutral-400">
            Example state
          </span>
        </div>

        <div className="grid gap-3 py-4 sm:grid-cols-[0.84fr_1.16fr] sm:py-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-neutral-500">
              Incoming call
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-gradient-to-br from-neutral-700 to-neutral-900 text-lg font-medium text-white">
                M
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-white">Mum</p>
                <p className="mt-1 text-xs text-neutral-500">Caller ID can be spoofed</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
              <div className="h-1.5 w-4/5 rounded-full bg-white/[0.06]" />
              <div className="h-1.5 w-2/3 rounded-full bg-white/[0.06]" />
            </div>
            <p className="mt-4 text-xs leading-5 text-neutral-500">
              A familiar voice is not identity proof.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-amber-200/15 bg-amber-200/[0.035] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-neutral-400">
                Available evidence
              </p>
              <span className="h-2 w-2 rounded-full bg-amber-300" />
            </div>
            <p className="mt-3 text-[2.6rem] font-semibold leading-none tracking-[-0.06em] text-amber-200 sm:text-5xl">
              VERIFY
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              This session has not been confirmed as a trusted connection.
            </p>
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-neutral-500">
                A safer next step
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">
                Pause. Call back using a number you already know.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-4">
          <div className="rounded-xl bg-white/[0.025] px-2 py-3 text-center sm:px-3">
            <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/30 text-[0.62rem] text-sky-200">
              1
            </span>
            <p className="mt-2 text-[0.65rem] leading-4 text-neutral-400 sm:text-xs">Pair first</p>
          </div>
          <div className="rounded-xl bg-white/[0.025] px-2 py-3 text-center sm:px-3">
            <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/30 text-[0.62rem] text-sky-200">
              2
            </span>
            <p className="mt-2 text-[0.65rem] leading-4 text-neutral-400 sm:text-xs">
              Confirm together
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.025] px-2 py-3 text-center sm:px-3">
            <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/30 text-[0.62rem] text-sky-200">
              3
            </span>
            <p className="mt-2 text-[0.65rem] leading-4 text-neutral-400 sm:text-xs">
              Pause if unsure
            </p>
          </div>
        </div>

        <p className="pt-4 text-center text-[0.62rem] leading-4 text-neutral-600">
          Illustrative interface. Actual status depends on available evidence and supported behavior.
        </p>
      </div>
    </div>
  );
}
