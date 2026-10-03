"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { PageShell } from "@/components/PageShell";

type PressureResult = {
  pressureScore: number;
  humanLikelihood: number;
  reasoning: string;
  verdict: "likely_human" | "likely_clone" | "uncertain";
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export default function AnalyzePage() {
  const [transcript, setTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PressureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const verdictColors: Record<
    PressureResult["verdict"],
    { bg: string; text: string; label: string }
  > = {
    likely_human: { bg: "bg-green-900/30", text: "text-green-300", label: "Likely human" },
    likely_clone: { bg: "bg-red-900/30", text: "text-red-300", label: "Likely clone" },
    uncertain: { bg: "bg-amber-900/30", text: "text-amber-300", label: "Uncertain" },
  };

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
      <p className="text-lg leading-7 text-neutral-300">
        Paste what the caller said — a transcript or message — and see if it shows pressure tactics
        like artificial urgency, secrecy, or demands for immediate payment.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-neutral-300 mb-2">
            Transcript or message
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={handleChange}
            disabled={isSubmitting}
            rows={8}
            maxLength={4000}
            placeholder="e.g., Mom, it's me. I'm in trouble. I need $500 right now — don't tell anyone."
            className={`w-full rounded-2xl border px-4 py-3 bg-neutral-900 text-neutral-50 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white ${
              fieldError ? "border-red-500" : "border-neutral-700"
            }`}
            aria-describedby={fieldError ? "transcript-error" : "transcript-hint"}
            aria-invalid={fieldError ? "true" : "false"}
          />
          {fieldError && (
            <p id="transcript-error" className="mt-1 text-sm text-red-400" role="alert">
              {fieldError}
            </p>
          )}
          {!fieldError && (
            <p id="transcript-hint" className="mt-1 text-sm text-neutral-500">
              {transcript.length}/4000 characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-white/10 px-6 py-3 font-medium text-neutral-50 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {isSubmitting ? "Analyzing…" : "Check for pressure"}
        </button>

        {error && (
          <div
            className="rounded-2xl bg-red-900/30 border border-red-700 p-4 text-red-300"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {result && (
          <section
            className="rounded-2xl border p-4 space-y-4"
            aria-live="polite"
            aria-label="Analysis result"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Result</h2>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  verdictColors[result.verdict].bg
                } ${verdictColors[result.verdict].text}`}
              >
                {verdictColors[result.verdict].label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-neutral-900 p-4 text-center">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Pressure score</p>
                <p className="text-4xl font-bold tabular-nums">{result.pressureScore}</p>
                <p className="text-xs text-neutral-500">/ 100</p>
              </div>
              <div className="rounded-xl bg-neutral-900 p-4 text-center">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Human likelihood</p>
                <p className="text-4xl font-bold tabular-nums">{result.humanLikelihood}</p>
                <p className="text-xs text-neutral-500">/ 100</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">Reasoning</h3>
              <p className="text-neutral-300 whitespace-pre-wrap">{result.reasoning}</p>
            </div>

            <p className="text-xs text-neutral-500">
              This is an advisory signal, not a guarantee. Always verify with the rotating code.
            </p>
          </section>
        )}

        <p className="text-xs text-neutral-500 text-center">
          Your transcript is sent to Featherless AI for analysis and is not stored by this app.
        </p>
      </form>
    </PageShell>
  );
}
