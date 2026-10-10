import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { HeroSceneSlot } from "@/components/landing/HeroSceneSlot";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { PairingDiagram } from "@/components/landing/PairingDiagram";
import { TrustStatesExplorer } from "@/components/landing/TrustStatesExplorer";
import { FAQ } from "@/components/landing/FAQ";

export const metadata: Metadata = {
  title: "Handshake — Verify the relationship, not the voice",
  description:
    "Handshake is an Android-first prototype for trusted-device pairing and clearer decisions during high-pressure calls. It does not detect cloned voices or analyze remote call audio.",
  openGraph: {
    title: "Handshake — Verify the relationship, not the voice",
    description:
      "Set up trusted relationships in advance. When a session cannot be confirmed, pause and verify through a channel you already trust.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handshake — Verify the relationship, not the voice",
    description:
      "Set up trusted relationships in advance. When a session cannot be confirmed, pause and verify through a channel you already trust.",
  },
};

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="hero-halo pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="site-shell relative grid gap-8 pb-16 pt-12 sm:gap-12 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.94fr)] lg:items-center lg:gap-10 lg:pb-24 lg:pt-16">
            <div className="animate-rise">
              <p className="eyebrow">Trust for high-pressure calls</p>
              <h1 className="mt-6 max-w-3xl text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.35rem]">
                A familiar voice
                <span className="block">isn&rsquo;t proof.</span>
                <span className="accent-italic mt-1 block text-sky-200">
                  Verify the relationship.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-neutral-300 sm:mt-7 sm:text-lg">
                Handshake is an Android-first prototype for checking trusted relationships before
                pressure turns into a rushed decision. Pair people in advance, review the trust
                evidence available for a session, and pause whenever it cannot be confirmed.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Link href="/download" className="cta cta-accent w-full min-[420px]:w-auto">
                  Get the Android app
                  <ArrowIcon />
                </Link>
                <a href="#how-it-works" className="cta cta-ghost w-full min-[420px]:w-auto">
                  How it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden="true" />
                  Pair in advance
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden="true" />
                  Confirm together
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden="true" />
                  Pause when unverified
                </span>
              </div>
              <p className="mt-5 max-w-xl text-xs leading-5 text-neutral-500">
                Prototype limits: Handshake does not detect cloned voices or access two-way remote
                audio from ordinary phone calls or third-party calling apps.
              </p>
            </div>

            <div className="relative min-w-0 lg:pl-2">
              <HeroSceneSlot />
            </div>
          </div>
        </section>

        <section id="download" aria-labelledby="download-heading" className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="site-shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
            <div className="max-w-2xl">
              <p className="eyebrow">Android prototype</p>
              <h2 id="download-heading" className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Try Handshake on your phone.
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                See how to get the latest test APK, install it on Android, and understand what this prototype currently supports.
              </p>
            </div>
            <Link href="/download" className="cta cta-accent w-full shrink-0 sm:w-auto">
              Download the Android app <ArrowIcon />
            </Link>
          </div>
        </section>

        <section
          id="why-it-matters"
          aria-labelledby="why-heading"
          className="rule-top scroll-mt-24"
        >
          <div className="site-shell grid gap-8 py-16 sm:gap-12 sm:py-24 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-20">
            <SectionHeading
              eyebrow="Why it matters"
              title={<span id="why-heading">Scams create urgency. Verification creates a pause.</span>}
              lead="A familiar voice and a familiar caller ID can both be misleading. The safest response to a high-pressure request is to stop and confirm it independently."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <article className="panel flex gap-4 p-5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-sm text-sky-200">
                  01
                </span>
                <div>
                  <h3 className="font-semibold text-white">Notice the pressure</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-400">
                    Urgency, secrecy, and demands for immediate payment are reasons to slow down,
                    not reasons to skip a check.
                  </p>
                </div>
              </article>
              <article className="panel flex gap-4 p-5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-sm text-sky-200">
                  02
                </span>
                <div>
                  <h3 className="font-semibold text-white">Verify out of band</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-400">
                    If a session is not confirmed, contact the person using a number or channel you
                    already know. Do not rely on the incoming call alone.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="border-y border-white/[0.06] bg-white/[0.015] scroll-mt-24"
        >
          <div className="site-shell py-16 sm:py-24">
            <SectionHeading
              eyebrow="How it works"
              title={<span id="how-heading">Set up trust before you need it.</span>}
              lead="Pairing happens in advance. Both people confirm the relationship, so a later check has a known starting point."
            />
            <div className="mt-10 sm:mt-14">
              <PairingDiagram />
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-neutral-400">
              A pairing is not a guarantee that every conversation is safe. A status is useful only
              when the current session is actually confirmed by the available trust evidence.
            </p>
          </div>
        </section>

        <section
          id="trust-states"
          aria-labelledby="states-heading"
          className="scroll-mt-24"
        >
          <div className="site-shell py-16 sm:py-24">
            <SectionHeading
              eyebrow="Trust states"
              title={<span id="states-heading">One clear state. No false certainty.</span>}
              lead="The prototype separates a confirmed relationship from a session that still needs checking and from a risk signal. Each state is named and explained; color never carries the message by itself."
            />
            <div className="mt-10 sm:mt-14">
              <TrustStatesExplorer />
            </div>
            <p className="mt-8 text-sm leading-7 text-neutral-400">
              These states describe the evidence Handshake has available—not whether a voice is
              genuine or whether the conversation itself is safe. When confirmation is missing,
              pause and verify independently.
            </p>
          </div>
        </section>

        <section
          id="tools"
          aria-labelledby="tools-heading"
          className="border-y border-white/[0.06] bg-white/[0.015] scroll-mt-24"
        >
          <div className="site-shell py-16 sm:py-24">
            <SectionHeading
              eyebrow="In the prototype"
              title={<span id="tools-heading">A few useful tools. One clear purpose.</span>}
              lead="Start with the trusted relationship. Use the supporting tools when a message feels wrong or something has already happened."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="panel flex min-w-0 flex-col p-6">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-sky-300">
                  Start here
                </p>
                <h3 className="mt-4 text-xl font-semibold text-white">Trusted pairing</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-neutral-400">
                  Establish a relationship between two devices in advance, with confirmation from
                  both people.
                </p>
                <Link
                  href="/circle"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                >
                  Explore pairing <ArrowIcon />
                </Link>
              </article>
              <article className="panel flex min-w-0 flex-col p-6">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-neutral-400">
                  Advisory
                </p>
                <h3 className="mt-4 text-xl font-semibold text-white">Pressure Check</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-neutral-400">
                  Submit text you choose to share and review possible signs of urgency, secrecy, or
                  payment pressure. It is not proof of fraud or identity.
                </p>
                <Link
                  href="/analyze"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                >
                  Check a message <ArrowIcon />
                </Link>
              </article>
              <article className="panel flex min-w-0 flex-col p-6">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-neutral-400">
                  After an incident
                </p>
                <h3 className="mt-4 text-xl font-semibold text-white">The first hour</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-neutral-400">
                  Follow a practical checklist if money or personal information may already have
                  been shared.
                </p>
                <Link
                  href="/first-hour"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                >
                  Open the checklist <ArrowIcon />
                </Link>
              </article>
            </div>
            <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-200/[0.04] p-5 sm:p-6">
              <h3 className="font-semibold text-white">Know the limits</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                This release does not detect voice clones or analyze remote two-way audio from
                carrier calls, WhatsApp, or Google Meet. Call-state and overlay behavior varies by
                device, permission, and app. Text analysis can be wrong and must not be the only
                basis for a safety-critical decision.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24">
          <div className="site-shell py-16 sm:py-24">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <SectionHeading
                eyebrow="FAQ"
                title={<span id="faq-heading">The important questions.</span>}
                lead="What the prototype can help with, what it cannot confirm, and what to do next."
              />
              <div>
                <FAQ />
                <p className="mt-6 text-sm leading-7 text-neutral-400">
                  Want to inspect the implementation? Read the{" "}
                  <a
                    href="https://github.com/sudomarc/handshake"
                    className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
                  >
                    public source
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://github.com/sudomarc/handshake/issues/new"
                    className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
                  >
                    report an issue
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="get-started" aria-labelledby="cta-heading" className="scroll-mt-24">
          <div className="site-shell pb-16 sm:pb-24">
            <div className="panel-hi relative overflow-hidden px-5 py-10 sm:px-10 sm:py-14">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="hero-halo absolute inset-0" />
                <div className="scene-grid absolute inset-0 opacity-40" />
              </div>
              <div className="relative mx-auto max-w-2xl text-center">
                <p className="eyebrow justify-center">Start with a trusted person</p>
                <h2
                  id="cta-heading"
                  className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-[2.7rem] sm:leading-[1.1]"
                >
                  Make room for a second check.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
                  Explore the pairing flow, see how the states are presented, and review the
                  prototype&rsquo;s limits before relying on it.
                </p>
                <div className="mt-7 flex flex-col items-stretch justify-center gap-3 min-[420px]:flex-row min-[420px]:items-center">
                  <Link href="/download" className="cta cta-accent w-full min-[420px]:w-auto">
                    Download for Android <ArrowIcon />
                  </Link>
                  <Link href="/demo" className="cta cta-ghost w-full min-[420px]:w-auto">
                    Walk through the demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
