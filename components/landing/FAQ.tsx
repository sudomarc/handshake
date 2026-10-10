"use client";

import { useState, type ReactNode } from "react";

interface FaqItem {
  q: string;
  a: ReactNode;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    q: "How does pairing work?",
    a: (
      <>
        Put two phones side by side in the Handshake app. On one phone tap “Show my QR”, on the
        other tap “Scan a QR”. The invitation is short-lived and single-use, and both people confirm
        on their own phone — the trust is mutual. There is no 32-character ID to type and nothing to
        read out loud. See{" "}
        <a
          href="/circle"
          className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
        >
          how pairing works
        </a>{" "}
        for the full flow.
      </>
    ),
  },
  {
    q: "What does “Trusted connection” mean?",
    a: (
      <>
        It means the required trust evidence was confirmed: both phones agreed to the pairing in
        person, and the backend verified the session between them. It is an evidence-based statement
        about the devices — not a promise that a conversation can never be fraudulent.
      </>
    ),
  },
  {
    q: "What if the other phone is offline or the backend can’t confirm the session?",
    a: (
      <>
        The state becomes “Verify” — the app cannot confirm the pairing right now, so it does not
        claim a trusted connection. Slow down and confirm another way: call back on a number you
        know, or ask a question only the real person could answer.
      </>
    ),
  },
  {
    q: "Does Handshake automatically detect every cloned voice?",
    a: (
      <>
        No. Handshake does not try to classify voices at all. It checks whether the call is coming
        from a phone you paired and confirmed with the person — something a cloned voice can never
        have. A perfect clone on an unpaired phone still shows “Verify”. Real-time audio analysis
        and cloned-voice detection are future feasibility work, not current capabilities.
      </>
    ),
  },
  {
    q: "Does transcript pressure analysis prove fraud?",
    a: (
      <>
        No. The pressure check is advisory: it reads a transcript or message you provide and flags
        manipulation tactics such as urgency, secrecy, or immediate payment requests. It is a
        helpful second signal, not proof of identity and not proof of a scam.
      </>
    ),
  },
  {
    q: "Can Handshake access audio from every calling app?",
    a: (
      <>
        No. Handshake does not automatically receive two-way audio from ordinary carrier calls or
        from third-party calling apps such as WhatsApp or Google Meet. The optional overlay can
        remain visible above other apps, but call recognition only ever reports what the trust
        backend actually confirmed. Any real-time call-audio analysis is gated behind a native
        feasibility study on supported platforms.
      </>
    ),
  },
  {
    q: "What should I do when further verification is required?",
    a: (
      <>
        Treat the call as unverified. End the pressure, call the person back on a number you already
        know, ask a private question only they could answer, and check the{" "}
        <a
          href="/first-hour"
          className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
        >
          first-hour checklist
        </a>{" "}
        if money or information has already moved.
      </>
    ),
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {FAQ_ITEMS.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.q}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 sm:px-6"
          >
            <h3>
              <button
                id={`faq-q-${index}`}
                type="button"
                aria-expanded={open}
                aria-controls={`faq-a-${index}`}
                onClick={() => setOpenIndex(open ? null : index)}
                className="faq-trigger"
              >
                <span className="text-[0.98rem] font-medium leading-6 sm:text-lg">{item.q}</span>
                <span
                  aria-hidden="true"
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-300 transition ${
                    open ? "rotate-45 border-sky-400/50 text-sky-300" : ""
                  }`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={`faq-a-${index}`}
              role="region"
              aria-labelledby={`faq-q-${index}`}
              className="faq-panel"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="pb-6 pr-8 text-[0.95rem] leading-7 text-neutral-400">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
