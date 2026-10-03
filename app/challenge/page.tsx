"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { PageShell } from "@/components/PageShell";

type ChallengeResult = {
  challenge: string;
  category: "personal" | "recent" | "common_knowledge";
  difficulty: "easy" | "medium" | "hard";
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

const categoryLabels: Record<ChallengeResult["category"], string> = {
  personal: "Personal / shared history",
  recent: "Recent event",
  common_knowledge: "Common knowledge",
};

const difficultyLabels: Record<ChallengeResult["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const difficultyColors: Record<ChallengeResult["difficulty"], { bg: string; text: string }> = {
  easy: { bg: "bg-green-900/30", text: "text-green-300" },
  medium: { bg: "bg-amber-900/30", text: "text-amber-300" },
  hard: { bg: "bg-red-900/30", text: "text-red-300" },
};

export default function ChallengePage() {
  const [context, setContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setResult(null);

    const trimmed = context.trim();
    if (!trimmed) {
      setFieldError("Please enter some shared context (a nickname, memory, etc.).");
      return;
    }
    if (trimmed.length > 2000) {
      setFieldError("Context is too long (maximum 2000 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: "demo-pair-id", context: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        const err = data as ApiError;
        switch (err.error?.code) {
          case "rate_limited":
            setError("Too many requests. Please wait a moment and try again.");
            break;
          case "not_configured":
            setError("The challenge service is not configured. Please try again later.");
            break;
          case "invalid_input":
            setFieldError(err.error.message);
            break;
          default:
            setError("Something went wrong. Please try again.");
        }
        return;
      }

      setResult(data as ChallengeResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
    if (fieldError) setFieldError(null);
  };

  return (
    <PageShell title="Personal question">
      <p className="text-lg leading-7 text-neutral-300">
        Save a few private details only you and your trusted contact know — a nickname, a shared
        memory, an inside joke, a recent event. We will generate a question only the real person
        could answer.
      </p>

      <div className="rounded-2xl border border-neutral-700 bg-neutral-900/50 p-4 mb-4">
        <p className="text-sm text-neutral-300">
          <strong className="font-medium">Privacy note:</strong> This context is sent to Featherless
          AI to generate the question. It is not stored by this app. Do not include passwords,
          financial details, or secrets that should never leave your device.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="context" className="block text-sm font-medium text-neutral-300 mb-2">
            Shared context (nickname, memory, inside joke, recent event…)
          </label>
          <textarea
            id="context"
            value={context}
            onChange={handleChange}
            disabled={isSubmitting}
            rows={6}
            maxLength={2000}
            placeholder="e.g., We call each other 'Boo'. Last week we laughed about the burnt toast incident at my place."
            className={`w-full rounded-2xl border px-4 py-3 bg-neutral-900 text-neutral-50 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white ${
              fieldError ? "border-red-500" : "border-neutral-700"
            }`}
            aria-describedby={fieldError ? "context-error" : "context-hint"}
            aria-invalid={fieldError ? "true" : "false"}
          />
          {fieldError && (
            <p id="context-error" className="mt-1 text-sm text-red-400" role="alert">
              {fieldError}
            </p>
          )}
          {!fieldError && (
            <p id="context-hint" className="mt-1 text-sm text-neutral-500">
              {context.length}/2000 characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-white/10 px-6 py-3 font-medium text-neutral-50 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {isSubmitting ? "Generating…" : "Generate question"}
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
            aria-label="Generated question"
          >
            <h2 className="text-xl font-semibold">Your question</h2>

            <div className="rounded-xl bg-neutral-900 p-6">
              <p className="text-xl leading-7 text-neutral-50 font-medium">{result.challenge}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-900 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-neutral-100">
                  {categoryLabels[result.category]}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-900 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Difficulty</p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[result.difficulty].bg} ${difficultyColors[result.difficulty].text}`}
                >
                  {difficultyLabels[result.difficulty]}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Ask this question during the call. Only the real person with this shared context can
              answer correctly.
            </p>
          </section>
        )}

        <p className="text-xs text-neutral-500 text-center">
          Your context is sent to Featherless AI to generate the question and is not stored by this
          app.
        </p>
      </form>
    </PageShell>
  );
}
