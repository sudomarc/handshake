"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useParams } from "next/navigation";
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

const categoryConfig: Record<
  ChallengeResult["category"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  personal: {
    label: "Personal / shared history",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
        />
      </svg>
    ),
    color: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  },
  recent: {
    label: "Recent event",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  },
  common_knowledge: {
    label: "Common knowledge",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.364c0-.566-.128-1.108-.36-.1.547z"
        />
      </svg>
    ),
    color: "bg-gray-500/10 border-gray-500/30 text-gray-300",
  },
};

const difficultyConfig: Record<ChallengeResult["difficulty"], { label: string; color: string }> = {
  easy: { label: "Easy", color: "bg-green-500/10 border-green-500/30 text-green-300" },
  medium: { label: "Medium", color: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  hard: { label: "Hard", color: "bg-red-500/10 border-red-500/30 text-red-300" },
};

export default function ChallengePage() {
  const params = useParams<{ pairId: string }>();
  const pairId = params.pairId;

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
        body: JSON.stringify({ pairId, context: trimmed }),
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
      <div className="section animate-in">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            Personal question
          </div>
          <p className="text-lg text-neutral-300">
            Save a few private details only you and your trusted contact know — a nickname, a shared
            memory, an inside joke, a recent event. We will generate a question only the real person
            could answer.
          </p>
        </div>

        {/* Privacy note */}
        <div className="card p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="font-medium text-amber-300">Privacy note</p>
              <p className="text-sm text-amber-400 mt-1">
                This context is sent to Featherless AI to generate the question. It is not stored by
                this app. Do not include passwords, financial details, or secrets that should never
                leave your device.
              </p>
            </div>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="context" className="label">
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
              className={`textarea ${fieldError ? "input-error" : ""}`}
              aria-describedby={fieldError ? "context-error" : "context-hint"}
              aria-invalid={fieldError ? "true" : "false"}
            />
            {fieldError && (
              <p id="context-error" className="error-text flex items-center gap-1" role="alert">
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
                {fieldError}
              </p>
            )}
            {!fieldError && (
              <p id="context-hint" className="hint text-right">
                {context.length}/2000 characters
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg btn-block">
            {isSubmitting ? (
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
                Generating…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                Generate question
              </>
            )}
          </button>

          {error && (
            <div
              className="alert-danger flex items-center gap-2"
              role="alert"
              aria-live="assertive"
            >
              <svg
                className="h-5 w-5 flex-shrink-0"
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
            </div>
          )}

          {/* Result */}
          {result && (
            <section className="animate-in" aria-live="polite" aria-label="Generated question">
              <div className="card p-5 space-y-5">
                <h2 className="text-xl font-semibold">Your question</h2>

                <div className="rounded-xl bg-neutral-900/50 p-6">
                  <p className="text-xl leading-7 text-neutral-50 font-medium">
                    {result.challenge}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${categoryConfig[result.category].color}`}>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">Category</p>
                    <div className="flex items-center gap-2 mt-1">
                      {categoryConfig[result.category].icon}
                      <span className="text-sm font-medium">
                        {categoryConfig[result.category].label}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-xl p-3 ${difficultyConfig[result.difficulty].color}`}>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">Difficulty</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1">
                      {difficultyConfig[result.difficulty].label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 text-center">
                  Ask this question during the call. Only the real person with this shared context
                  can answer correctly.
                </p>
              </div>
            </section>
          )}

          <p className="text-xs text-neutral-500 text-center">
            Your context is sent to Featherless AI to generate the question and is not stored by
            this app.
          </p>
        </form>
      </div>
    </PageShell>
  );
}
