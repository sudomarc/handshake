"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { PageShell } from "@/components/PageShell";

type PressureResult = {
  pressureScore: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
};

type ApiError = {
  error: { code: string; message: string };
};

const riskConfig: Record<
  PressureResult["riskLevel"],
  { label: string; color: "success" | "danger" | "warning" }
> = {
  low: { label: "Low pressure", color: "success" },
  medium: { label: "Medium pressure", color: "warning" },
  high: { label: "High pressure", color: "danger" },
};

const colorStyles = {
  success: "bg-green-500/10 border-green-500/30 text-green-300",
  danger: "bg-red-500/10 border-red-500/30 text-red-300",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
};

export default function AnalyzePage() {
  const [transcript, setTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PressureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setResult(null);

    const trimmed = transcript.trim();
    if (!trimmed) {
      setFieldError("Please paste a transcript or message to analyze.");
      return;
    }
    if (trimmed.length > 4000) {
      setFieldError("Transcript is too long (maximum 4000 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        const err = data as ApiError;
        switch (err.error?.code) {
          case "rate_limited":
            setError("Too many requests. Please wait a moment and try again.");
            break;
          case "not_configured":
            setError("The analysis service is not configured. Please try again later.");
            break;
          case "invalid_input":
            setFieldError(err.error.message);
            break;
          default:
            setError("Something went wrong. Please try again.");
        }
        return;
      }

      setResult(data as PressureResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
    if (fieldError) setFieldError(null);
  };

  return (
    <PageShell title="Pressure check">
      <div className="section animate-in">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Pressure check
          </div>
          <p className="text-lg text-neutral-300">
            Paste what the caller or sender said to check for social-engineering pressure tactics.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="transcript" className="label">
              Transcript or message
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={handleChange}
              disabled={isSubmitting}
              rows={7}
              maxLength={4000}
              placeholder="e.g., Mom, it's me. I'm in trouble. I need $500 right now — don't tell anyone."
              className={`textarea ${fieldError ? "input-error" : ""}`}
              aria-describedby={fieldError ? "transcript-error" : "transcript-hint"}
              aria-invalid={fieldError ? "true" : "false"}
            />
            {fieldError ? (
              <p id="transcript-error" className="error-text" role="alert">
                {fieldError}
              </p>
            ) : (
              <p id="transcript-hint" className="hint text-right">
                {transcript.length}/4000 characters
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg btn-block">
            {isSubmitting ? "Checking…" : "Check for pressure"}
          </button>

          {error ? (
            <div className="alert-danger" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}

          {result ? (
            <section className="animate-in" aria-live="polite" aria-label="Pressure result">
              <div className="card p-5 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">Result</h2>
                  <span
                    className={`badge ${colorStyles[riskConfig[result.riskLevel].color]}`}
                  >
                    {riskConfig[result.riskLevel].label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-neutral-900/50 p-5 text-center">
                    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">
                      Pressure score
                    </p>
                    <p className="text-4xl font-bold tabular-nums text-neutral-50">
                      {result.pressureScore}
                    </p>
                    <p className="text-xs text-neutral-500">/ 100</p>
                  </div>
                  <div className="rounded-xl bg-neutral-900/50 p-5 text-center">
                    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">
                      Risk level
                    </p>
                    <p className="text-2xl font-bold text-neutral-50 capitalize">
                      {result.riskLevel}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-300 mb-2">Why this was flagged</h3>
                  <p className="text-neutral-300 whitespace-pre-wrap leading-7">{result.reasoning}</p>
                </div>

                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                  <p className="font-medium text-amber-300">Advisory signal</p>
                  <p className="text-sm text-amber-400 mt-1">
                    This checks pressure tactics only. It does not prove fraud or identity. Use the
                    rotating code to verify a trusted person.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <p className="text-xs text-neutral-500 text-center">
            Your transcript is sent to Featherless AI for analysis and is not stored by this app.
          </p>
        </form>
      </div>
    </PageShell>
  );
}
