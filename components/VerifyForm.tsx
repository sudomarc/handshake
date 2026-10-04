"use client";

import { useState, type FormEvent } from "react";
import { verifyCodeResponseSchema, type Verdict } from "@/lib/schemas";

const MESSAGES: Record<
  Verdict,
  { title: string; body: string; icon: React.ReactNode; variant: "success" | "danger" | "neutral" }
> = {
  waiting: {
    title: "Waiting for code",
    body: "Ask the caller to say the 6 digits. Then type what you heard.",
    icon: (
      <svg
        className="h-8 w-8 text-neutral-400 animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    variant: "neutral",
  },
  verified: {
    title: "Verified",
    body: "The caller knows the code. They have access to your trusted connection.",
    icon: (
      <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    variant: "success",
  },
  "not-verified": {
    title: "Not verified",
    body: "The code does not match. Do not send money or share sensitive info. Hang up and call them back on a number you already know.",
    icon: (
      <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2-2h.01M12 22a10 10 0 110-20a10 10 0 010 20z"
        />
      </svg>
    ),
    variant: "danger",
  },
};

function readMessage(json: unknown): string | null {
  if (typeof json !== "object" || json === null || !("error" in json)) return null;
  const error = (json as { error: unknown }).error;
  if (typeof error !== "object" || error === null || !("message" in error)) return null;
  const message = (error as { message: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function VerifyForm({ pairId }: { pairId: string }) {
  const [code, setCode] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("waiting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Type the 6 digits you heard.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, code }),
      });
      const json: unknown = await res.json();
      if (res.status === 429) {
        setError(readMessage(json) ?? "Too many tries. Wait a moment, then try again.");
        return;
      }
      if (!res.ok) throw new Error("request failed");
      setVerdict(verifyCodeResponseSchema.parse(json).verdict);
    } catch {
      setError("We couldn't check the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const message = MESSAGES[verdict];
  const variantStyles = {
    success: "bg-green-500/10 border-green-500/30 text-green-300",
    danger: "bg-red-500/10 border-red-500/30 text-red-300",
    neutral: "bg-neutral-800/50 border-neutral-700 text-neutral-300",
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Input form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="claimed-code" className="label">
          Code the caller said
        </label>
        <div className="relative">
          <input
            id="claimed-code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="input text-center text-4xl sm:text-5xl tabular-nums tracking-[0.4em] font-mono py-4 focus:ring-sky-400"
            placeholder="000000"
            disabled={busy}
            aria-describedby={error ? "code-error" : undefined}
            aria-invalid={error ? "true" : "false"}
          />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 rounded-xl">
              <svg
                className="h-6 w-6 text-neutral-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
        {error && (
          <p
            id="code-error"
            role="alert"
            className="error-text text-center flex items-center justify-center gap-1"
          >
            <svg
              className="h-4 w-4 flex-shrink-0"
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
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary btn-lg btn-block group">
          {busy ? (
            <>
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Checking…</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Check the code</span>
            </>
          )}
        </button>
      </form>

      {/* Result display - prominent visual feedback */}
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-6 text-center animate-in ${variantStyles[message.variant]}`}
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          {message.icon}
          <h3 className="text-2xl font-bold">{message.title}</h3>
        </div>
        <p className="text-lg leading-7">{message.body}</p>
      </div>
    </div>
  );
}
