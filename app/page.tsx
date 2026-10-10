import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { HeroSceneSlot } from "@/components/landing/HeroSceneSlot";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { PairingDiagram } from "@/components/landing/PairingDiagram";
import { TrustStatesExplorer } from "@/components/landing/TrustStatesExplorer";
import { FAQ } from "@/components/landing/FAQ";
import { Logo, Mark } from "@/components/landing/Logo";

export const metadata: Metadata = {
  title: "Handshake — Know who's really on the line",
  description:
    "Handshake is an Android prototype for establishing device trust with a short-lived QR invitation and checking the evidence a supported flow can confirm. It does not detect cloned voices or automatically analyze every call.",
  openGraph: {
    title: "Handshake — Know who's really on the line",
    description:
      "A cloned voice is not identity proof. Handshake explores a second signal: a trust relationship established between devices in person, with clear limits when evidence is missing.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handshake — Know who's really on the line",
    description:
      "A cloned voice is not identity proof. Handshake explores a second signal: a trust relationship established between devices in person, with clear limits when evidence is missing.",
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
        {/* ------------------------------------------------------------------ */}
        {/* HERO                                                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div className="hero-halo pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="site-shell relative grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-center lg:gap-6 lg:pb-28 lg:pt-16">
            <div className="animate-rise">
              <p className="eyebrow">Device-level trust for phone calls</p>
              <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.15rem]">
                The voice can be cloned.
                <span className="block">
                  <em className="accent-italic text-sky-200">The person</em> can still prove who
                  they are.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-400">
                Handshake lets two people establish a device-trust relationship in person with a short-lived QR invitation. When a supported flow can confirm both devices, it reports that evidence. It does not identify voices or analyze every call.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className="cta cta-accent">
                  Get the Android app
                  <ArrowIcon />
                </Link>
                <a href="#approach" className="cta cta-ghost">
                  The approach
                </a>
              </div>
              <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-neutral-400">
                <span className="text-neutral-300">Pair once</span>
                <span aria-hidden="true">·</span>
                <span>In person</span>
                <span aria-hidden="true">·</span>
                <span>Check available evidence</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300">Trusted / Verify / Risk</span>
              </p>
            </div>

            <div className="relative h-[330px] w-full sm:h-[420px] lg:h-[560px]">
              <HeroSceneSlot />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* THE PROBLEM                                                       */}
        {/* ------------------------------------------------------------------ */}
        <section id="problem" aria-labelledby="problem-heading" className="rule-top scroll-mt-24">
          <div className="site-shell grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-20">
            <SectionHeading
              eyebrow="The problem"
              title={<span id="problem-heading">A voice you recognize isn&rsquo;t proof.</span>}
              lead="A modern voice clone needs only seconds of audio — a voicemail, a social-media post — to sound almost indistinguishable from someone you love. Then the call arrives with urgency attached."
            />
            <div className="flex flex-col justify-center">
              <ul className="space-y-7">
                <li className="flex gap-5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-medium text-white">
                      A crisis you haven&rsquo;t heard about.
                    </h3>
                    <p className="mt-1.5 leading-7 text-neutral-400">
                      &ldquo;Mom, it&rsquo;s me — I&rsquo;m in trouble. I need money right
                      now.&rdquo;
                    </p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-medium text-white">An instruction to keep it secret.</h3>
                    <p className="mt-1.5 leading-7 text-neutral-400">
                      &ldquo;Please don&rsquo;t tell anyone. Not yet.&rdquo;
                    </p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-medium text-white">A demand for speed.</h3>
                    <p className="mt-1.5 leading-7 text-neutral-400">
                      &ldquo;The account closes today — it has to be now.&rdquo;
                    </p>
                  </div>
                </li>
              </ul>
              <p className="mt-9 border-l-2 border-sky-400/60 pl-5 text-lg leading-8 text-neutral-300">
                Under pressure, it helps to pause and check a separate signal. A device relationship can add context — but only when the app can actually verify it.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* THE APPROACH                                                      */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="approach"
          aria-labelledby="approach-heading"
          className="border-y border-white/[0.06] bg-white/[0.015] scroll-mt-24"
        >
          <div className="site-shell py-20 sm:py-28">
            <SectionHeading
              eyebrow="The approach"
              title={
                <span id="approach-heading">
                  Stop trying to hear the fake.
                  <br />
                  Verify the device.
                </span>
              }
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <div className="panel p-7 sm:p-8">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-neutral-400">
                  Voice detection
                </p>
                <p className="mt-4 text-[1.05rem] leading-8 text-neutral-300">
                  Listens for what a clone got wrong. Genuinely useful — and an arms race: every
                  detector is eventually outpaced by a better generator.
                </p>
                <p className="mt-4 text-sm leading-7 text-neutral-400">
                  A good clone can fool a good listener, and &ldquo;probably&rdquo; isn&rsquo;t
                  enough when money is on the line.
                </p>
              </div>
              <div className="panel-hi relative overflow-hidden p-7 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl"
                  aria-hidden="true"
                />
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-sky-300">
                  Handshake
                </p>
                <p className="mt-4 text-[1.05rem] leading-8 text-neutral-200">
                  Checks a different signal: a trust relationship established between two devices in person. Copying a voice alone does not establish that relationship, but pairing is not a guarantee against fraud.
                </p>
                <p className="mt-4 text-sm leading-7 text-neutral-400">
                  When the supported trust flow confirms both devices, Handshake can report that evidence instead of trying to classify a voice. A visible overlay alone is not proof.
                </p>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-7 text-neutral-400">
              Handshake is not a promise that no call can ever go wrong. A &ldquo;Trusted
              connection&rdquo; means the required trust evidence was confirmed. When evidence is
              missing, Handshake says so.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* HOW IT WORKS                                                      */}
        {/* ------------------------------------------------------------------ */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-24">
          <div className="site-shell py-20 sm:py-28">
            <SectionHeading
              eyebrow="How it works"
              title={
                <span id="how-heading">Trust is built once, then recognized automatically.</span>
              }
              lead="No 32-character codes, nothing to read aloud. The whole setup is two phones, side by side."
            />
            <div className="mt-14">
              <PairingDiagram />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* TRUST STATES                                                      */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="trust-states"
          aria-labelledby="states-heading"
          className="border-y border-white/[0.06] bg-white/[0.015] scroll-mt-24"
        >
          <div className="site-shell py-20 sm:py-28">
            <SectionHeading
              eyebrow="Trust states"
              title={<span id="states-heading">One honest state, at a time.</span>}
              lead="During a call, Handshake shows exactly one state, based on the evidence available. Color is used consistently — and every state is also named and explained, so it never relies on color alone."
            />
            <div className="mt-14">
              <TrustStatesExplorer />
            </div>
            <p className="mt-10 text-sm leading-7 text-neutral-400">
              Handshake never shows &ldquo;Protected&rdquo; without evidence. A trusted connection
              is only reported after both phones confirmed the relationship and the backend verified
              the session. &ldquo;Risk detected&rdquo; requires a real local risk signal.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* CORE CAPABILITIES                                                 */}
        {/* ------------------------------------------------------------------ */}
        <section id="capabilities" aria-labelledby="caps-heading" className="scroll-mt-24">
          <div className="site-shell py-20 sm:py-28">
            <SectionHeading
              eyebrow="Core capabilities"
              title={<span id="caps-heading">What Handshake does today</span>}
              lead="One primary capability — pairing — carries the story. Two complementary features sit beside it, with their limits stated."
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
              {/* Primary */}
              <div className="panel-hi relative flex flex-col justify-between overflow-hidden p-7 sm:p-9">
                <div
                  className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-sky-400/[0.07] blur-3xl"
                  aria-hidden="true"
                />
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky-300">
                    Device trust protocol
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                    QR pairing &amp; trusted-device recognition
                  </h3>
                  <p className="mt-4 max-w-xl leading-8 text-neutral-300">
                    Add a trusted person, scan a short-lived QR invitation, and confirm on both phones. When the supported flow verifies both devices, Handshake can report that relationship. If evidence is missing, the right state is “Verify” — not a promise of protection.
                  </p>
                </div>
                <ul className="mt-8 flex flex-wrap gap-2" aria-label="Pairing fundamentals">
                  {[
                    "Short-lived, single-use invite",
                    "Mutual confirmation",
                    "Nothing to type",
                    "Revocable",
                  ].map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-400"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Complementary */}
              <div className="flex flex-col gap-5">
                <div className="panel flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    Pressure check{" "}
                    <span className="font-mono text-xs font-normal text-neutral-400">
                      · advisory
                    </span>
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-neutral-400">
                    Paste a transcript or message and Handshake grades the manipulation tactics
                    inside it — urgency, secrecy, immediate payment. A signal, not a verdict: it
                    does not detect cloned voices and does not prove identity.
                  </p>
                  <Link
                    href="/analyze"
                    className="mt-5 inline-flex items-center gap-2 py-1.5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                  >
                    Open pressure check <ArrowIcon />
                  </Link>
                </div>
                <div className="panel flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    The first hour
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-neutral-400">
                    A calm, static checklist for the 60 minutes after money has already moved. No
                    AI, no decisions under stress — just the right steps, in order.
                  </p>
                  <Link
                    href="/first-hour"
                    className="mt-5 inline-flex items-center gap-2 py-1.5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                  >
                    Open the checklist <ArrowIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PRIVACY & TRANSPARENCY                                            */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="privacy"
          aria-labelledby="privacy-heading"
          className="border-y border-white/[0.06] bg-white/[0.015] scroll-mt-24"
        >
          <div className="site-shell grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <SectionHeading
              eyebrow="Privacy &amp; transparency"
              title={<span id="privacy-heading">What we can honestly say</span>}
              lead="These statements come from code and documentation — not from an imagined feature list."
            />
            <ol className="flex flex-col gap-7">
              {[
                {
                  title: "Trust is established by people, in person.",
                  text: "Pairing requires both phones physically together. The QR invitation dies after one use or on expiry — there is nothing to screenshot and reuse later.",
                },
                {
                  title: "States depend on available evidence.",
                  text: "When the peer is offline, unpaired, or the backend can’t confirm the session, the state is “Verify” — never a false “Protected”.",
                },
                {
                  title: "Transcript analysis is advisory.",
                  text: "The pressure check grades manipulation tactics in text you provide. It does not establish identity and it does not prove fraud.",
                },
                {
                  title: "No hidden listening.",
                  text: "Handshake does not automatically receive two-way audio from carrier calls or third-party calling apps such as WhatsApp. Call recognition reports only what the trust backend confirmed. Real-time call-audio analysis is a feasibility study, not a shipped feature.",
                },
                {
                  title: "Prototype honesty.",
                  text: "The demo trust store is in-memory per server instance, and a paired phone is a device credential — revoke it if the device is lost.",
                },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-5">
                  <span className="font-mono text-sm text-neutral-400">0{index + 1}</span>
                  <div>
                    <h3 className="font-medium leading-6 text-white">{item.title}</h3>
                    <p className="mt-2 leading-7 text-neutral-400">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* FAQ                                                               */}
        {/* ------------------------------------------------------------------ */}
        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24">
          <div className="site-shell py-20 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <SectionHeading
                eyebrow="FAQ"
                title={<span id="faq-heading">Questions, answered honestly.</span>}
                lead="Plain answers about pairing, trust states, and exactly what Handshake can and cannot do."
              />
              <div>
                <FAQ />
                <p className="mt-6 text-sm leading-7 text-neutral-400">
                  Something else on your mind? The project is public —{" "}
                  <a
                    href="https://github.com/sudomarc/handshake"
                    className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-300"
                  >
                    read the source
                  </a>{" "}
                  or open an issue on GitHub.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* FINAL CTA                                                         */}
        {/* ------------------------------------------------------------------ */}
        <section id="get-started" aria-labelledby="cta-heading" className="scroll-mt-24">
          <div className="site-shell pb-20 sm:pb-28">
            <div className="panel-hi relative overflow-hidden px-6 py-14 sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="hero-halo absolute inset-0" />
                <div className="scene-grid absolute inset-0 opacity-40" />
              </div>
              <div className="relative mx-auto max-w-2xl text-center">
                <p className="eyebrow justify-center">Next step</p>
                <h2
                  id="cta-heading"
                  className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.1]"
                >
                  Two phones. One scan.
                  <span className="block accent-italic text-sky-200">A calmer call.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-neutral-400">
                  Handshake Personal is an Android prototype exploring QR pairing and evidence-based trust states. It does not access remote audio from ordinary carrier calls or apps such as WhatsApp and Google Meet.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/download" className="cta cta-accent">
                    Get the Android app
                    <ArrowIcon />
                  </Link>
                  <Link href="/demo" className="cta cta-ghost">
                    Walk the demo flow
                  </Link>
                  <a href="https://github.com/sudomarc/handshake" className="cta cta-ghost">
                    Read the source
                  </a>
                </div>
                <p className="mt-8 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-neutral-400">
                  Prototype · Android · Trusted / Verify / Risk
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-white/[0.07]">
        <div className="site-shell flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-sky-400">
                <Mark className="h-6 w-6" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">Handshake</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              An Android prototype exploring device-to-device trust. It does not detect cloned voices or automatically analyze every call.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-x-12"
          >
            <Link
              href="/circle"
              className="inline-block py-1 text-neutral-400 transition hover:text-white"
            >
              How pairing works
            </Link>
            <Link
              href="/demo"
              className="inline-block py-1 text-neutral-400 transition hover:text-white"
            >
              Pairing demo
            </Link>
            <Link
              href="/analyze"
              className="inline-block py-1 text-neutral-400 transition hover:text-white"
            >
              Pressure check
            </Link>
            <Link
              href="/first-hour"
              className="inline-block py-1 text-neutral-400 transition hover:text-white"
            >
              The first hour
            </Link>
            <a
              href="https://github.com/sudomarc/handshake"
              className="inline-block py-1 text-neutral-400 transition hover:text-white"
            >
              Source on GitHub
            </a>
          </nav>
        </div>
        <div className="border-t border-white/[0.05]">
          <div className="site-shell flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-neutral-400">
              Trusted connection · Verify · Risk detected
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
