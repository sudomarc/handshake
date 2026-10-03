"use client";

import Link from "next/link";
import { useState } from "react";
import { createPairResponseSchema } from "@/lib/schemas";

export function CreatePair() {
  const [pairId, setPairId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle", { method: "POST" });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("request failed");
      setPairId(createPairResponseSchema.parse(json).pairId);
    } catch {
      setError("We couldn't create the pair. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const linkStyle =
    "rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-lg font-medium transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="rounded-2xl bg-white p-4 text-lg font-semibold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
      >
        {busy ? "Creating…" : pairId ? "Create another pair" : "Create a trusted pair"}
      </button>
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : null}
      {pairId ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg leading-7 text-neutral-300">
            Share this pair code only with the person you trust, in person:
          </p>
          <p className="break-all rounded-2xl border border-neutral-700 p-4 font-mono text-lg">
            {pairId}
          </p>
          <Link href={`/codes/${pairId}`} className={linkStyle}>
            I&rsquo;m the one calling — show my code
          </Link>
          <Link href={`/verify/${pairId}`} className={linkStyle}>
            I&rsquo;m receiving a call — verify it
          </Link>
        </div>
      ) : null}
    </div>
  );
}
