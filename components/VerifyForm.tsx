"use client";

import { useState, type FormEvent } from "react";
import { verifyCodeResponseSchema, type Verdict } from "@/lib/schemas";

const MESSAGES: Record<Verdict, { title: string; body: string; style: string }> = {
  waiting: {
    title: "Waiting for the code",
    body: "Ask the caller to say the 6 digits. Then type what you heard.",
    style: "border-neutral-800 bg-neutral-900 text-neutral-300",
  },
  verified: {
    title: "Verified",
    body: "The caller knows the code. They have access to your trusted connection.",
    style: "border-green-800 bg-green-950 text-green-100",
  },
  "not-verified": {
    title: "Not verified",
    body: "The code does not match. Do not send money or share sensitive info. Hang up and call the person back on a number you already know.",
    style: "border-red-800 bg-red-950 text-red-100",
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

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="claimed-code" className="text-lg font-medium">
          Code the caller said
        </label>
        <input
          id="claimed-code"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-center text-4xl tabular-nums tracking-[0.3em] focus-visible:outline-2 focus-visible:outline-white"
          placeholder="000000"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-white p-4 text-lg font-semibold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check the code"}
        </button>
        {error ? (
          <p role="alert" className="text-red-300 text-center">
            {error}
          </p>
        ) : null}
      </form>
      <div role="status" className={`rounded-2xl border p-6 ${message.style}`}>
        <p className="text-2xl font-bold text-center">{message.title}</p>
        <p className="mt-2 text-lg leading-7 text-center">{message.body}</p>
      </div>
    </div>
  );
}
