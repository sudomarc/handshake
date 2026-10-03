"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function DemoPage() {
  const [pairId, setPairId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPair() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle", { method: "POST" });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("request failed");
      const data = json as { pairId: string };
      setPairId(data.pairId);
    } catch {
      setError("Could not create pair. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Demo mode">
      <p className="text-lg leading-7 text-neutral-300 text-center max-w-xl mx-auto">
        Demo mode shows both sides of a verification at once. Open this page on a desktop, create a
        pair, then use two phones to test the live verification.
      </p>

      <div className="flex flex-col gap-4 max-w-xl mx-auto">
        <button
          type="button"
          onClick={createPair}
          disabled={busy || !!pairId}
          className="rounded-2xl bg-white p-4 text-lg font-semibold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          {busy ? "Creating…" : pairId ? "Pair created" : "Create demo pair"}
        </button>

        {error && (
          <p role="alert" className="text-red-300 text-center">
            {error}
          </p>
        )}

        {pairId ? (
          <>
            <div className="rounded-2xl border border-neutral-700 p-4 text-center">
              <p className="text-sm text-neutral-400 mb-2">Pair code</p>
              <p className="break-all font-mono text-lg">{pairId}</p>
              <p className="text-xs text-neutral-500 mt-2">
                Share this code in person with the person you trust
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href={`/verify/${pairId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-green-800 bg-green-950/30 p-6 text-center transition-colors hover:border-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="block text-lg font-semibold text-green-300 mb-2">
                  Device A — Receiver
                </span>
                <span className="block text-sm text-neutral-400">Verify a call</span>
              </Link>

              <Link
                href={`/codes/${pairId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-blue-800 bg-blue-950/30 p-6 text-center transition-colors hover:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="block text-lg font-semibold text-blue-300 mb-2">
                  Device B — Caller
                </span>
                <span className="block text-sm text-neutral-400">My code (read aloud)</span>
              </Link>
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Open each link on a separate device. Both will show the same rotating code.
            </p>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
