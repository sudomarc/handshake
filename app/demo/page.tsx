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
      <div className="section animate-in">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l4 4-4 4"
              />
            </svg>
            Demo mode
          </div>
          <p className="text-lg text-neutral-300 text-center max-w-xl mx-auto">
            Demo mode shows both sides of a verification at once. Open this page on a desktop,
            create a pair, then use two phones to test the live verification.
          </p>
        </div>

        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <button
            type="button"
            onClick={createPair}
            disabled={busy || !!pairId}
            className="btn-primary btn-lg btn-block"
          >
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
                Creating…
              </>
            ) : pairId ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Pair created
              </>
            ) : (
              "Create demo pair"
            )}
          </button>

          {error && (
            <p role="alert" className="error-text text-center">
              {error}
            </p>
          )}

          {pairId ? (
            <>
              <div className="card p-5 text-center">
                <p className="text-sm text-neutral-400 mb-2">Pair code</p>
                <p className="break-all font-mono text-lg text-neutral-50 tracking-wider">
                  {pairId}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  Share this code in person with the person you trust
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href={`/verify/${pairId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-elevated p-6 text-center group"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg
                      className="h-6 w-6 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <span className="block text-lg font-semibold text-green-400 mb-1">
                    Device A — Receiver
                  </span>
                  <span className="block text-sm text-neutral-400">Verify a call</span>
                </Link>

                <Link
                  href={`/codes/${pairId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-elevated p-6 text-center group"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg
                      className="h-6 w-6 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                  <span className="block text-lg font-semibold text-blue-400 mb-1">
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
      </div>
    </PageShell>
  );
}
