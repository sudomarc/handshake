"use client";

import { useState, type ReactNode } from "react";

interface FaqItem {
  q: string;
  a: ReactNode;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    q: "Does Handshake detect cloned voices?",
    a: (
      <>
        No. Handshake does not classify voices or detect deepfakes. It explores trusted-device
        pairing and shows the trust state supported by the available evidence. If a request feels
        wrong, confirm it through a separate channel you already trust.
      </>
    ),
  },
  {
    q: "Does a trusted state guarantee that a call is safe?",
    a: (
      <>
        No. A trusted state means the configured relationship and session evidence were confirmed.
        It does not prove that every request is legitimate or that a device has not been compromised.
        Never send money or share secrets solely because a state looks reassuring.
      </>
    ),
  },
  {
    q: "Can Handshake analyze audio from every call, including WhatsApp?",
    a: (
      <>
        No. The current release does not receive two-way remote audio from ordinary carrier calls
        or third-party calling apps such as WhatsApp and Google Meet. Call-state and overlay behavior
        may vary by device, permission, and app, and does not mean live speech analysis is running.
      </>
    ),
  },
  {
    q: "What does Pressure Check tell me?",
    a: (
      <>
        It reviews text you choose to submit and may flag tactics such as urgency, secrecy, or
        pressure to pay immediately. The result is advisory: it is not proof of fraud, speaker
        identity, or intent, and it can be wrong.
      </>
    ),
  },
  {
    q: "What should I do when a session says Verify?",
    a: (
      <>
        Pause the request. Hang up if needed and call the person back using a number you already
        know, or confirm with them through another trusted channel. If money or personal information
        may already have been shared, follow the{" "}
        <a
          href="/first-hour"
          className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
        >
          first-hour checklist
        </a>
        .
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
                id={"faq-q-" + index}
                type="button"
                aria-expanded={open}
                aria-controls={"faq-a-" + index}
                onClick={() => setOpenIndex(open ? null : index)}
                className="faq-trigger"
              >
                <span className="text-[0.98rem] font-medium leading-6 sm:text-lg">{item.q}</span>
                <span
                  aria-hidden="true"
                  className={
                    "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-300 transition " +
                    (open ? "rotate-45 border-sky-400/50 text-sky-300" : "")
                  }
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
              id={"faq-a-" + index}
              role="region"
              aria-labelledby={"faq-q-" + index}
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
