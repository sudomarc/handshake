"use client";

import Link from "next/link";
import { useState } from "react";
import { createPairResponseSchema } from "@/lib/schemas";

export function CreatePair() {
  const [pairId, setPairId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "choosing" | "created">("idle");

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/circle", { method: "POST" });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error("request failed");
      setPairId(createPairResponseSchema.parse(json).pairId);
      setStep("created");
    } catch {
      setError("We couldn't create the trusted person. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setPairId(null);
    setStep("idle");
  }

  if (step === "idle") {
    return (
      <div className="card p-6 space-y-4 animate-in">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-neutral-50 mb-1">Add a trusted person</h3>
          <p className="text-neutral-400">
            Create a private connection with someone you trust. You will both get a shared code that
            changes every 30 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="btn-primary btn-lg btn-block"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <span>Add a trusted person</span>
        </button>
        {error && (
          <p role="alert" className="error-text text-center">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (step === "choosing") {
    return (
      <div className="card p-6 space-y-4 animate-in">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-neutral-50 mb-1">Who is calling?</h3>
          <p className="text-neutral-500 text-sm">This determines which screen each person sees.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/codes/${pairId}`} className="card-interactive p-5 text-center group">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
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
            <span className="block font-medium text-neutral-50">I am calling</span>
            <span className="block text-sm text-neutral-500 mt-1">Show my code</span>
          </Link>
          <Link href={`/verify/${pairId}`} className="card-interactive p-5 text-center group">
            <div className="w-12 h-12 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
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
            <span className="block font-medium text-neutral-50">I am receiving</span>
            <span className="block text-sm text-neutral-500 mt-1">Verify the call</span>
          </Link>
        </div>
        <button onClick={handleReset} className="btn-ghost btn-block">
          Start over
        </button>
      </div>
    );
  }

  // Created state
  return (
    <div className="card p-6 space-y-4 animate-in">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-green-400 mb-1">Trusted person added</h3>
        <p className="text-neutral-400">Share this code with them in person</p>
      </div>

      <div className="card p-4">
        <p className="text-sm text-neutral-400 mb-2">Your pair code</p>
        <p className="break-all font-mono text-lg text-neutral-50 tracking-wider">{pairId}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/codes/${pairId}`} className="btn-primary btn-block">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>I am calling</span>
        </Link>
        <Link href={`/verify/${pairId}`} className="btn-secondary btn-block">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>I am receiving</span>
        </Link>
      </div>

      <button onClick={handleReset} className="btn-ghost btn-block">
        Add another person
      </button>
    </div>
  );
}
