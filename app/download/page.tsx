import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Logo } from "@/components/landing/Logo";

const ANDROID_WORKFLOW_URL =
  "https://github.com/sudomarc/handshake/actions/workflows/android-apk.yml";
const SOURCE_URL = "https://github.com/sudomarc/handshake";

export const metadata: Metadata = {
  title: "Download Handshake for Android",
  description:
    "Get the Handshake Personal Android prototype. Download instructions, build availability, installation steps and current capability limits.",
  openGraph: {
    title: "Download Handshake for Android",
    description:
      "Install the Handshake Personal Android prototype and learn what the current build does — and does not — support.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Download Handshake for Android",
    description:
      "Install the Handshake Personal Android prototype and learn what the current build does — and does not — support.",
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

export default function DownloadPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="hero-halo pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="site-shell relative grid gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow">Handshake Personal · Android prototype</p>
              <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl">
                Get Handshake on your phone.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-300">
                Explore QR-based pairing and device-trust concepts in the Handshake Personal
                Android prototype. This is a test build, not a production security product.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={ANDROID_WORKFLOW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta cta-accent"
                >
                  Open latest Android build
                  <ArrowIcon />
                </a>
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta cta-ghost"
                >
                  View source code
                </a>
              </div>
              <p className="mt-6 max-w-xl text-sm leading-7 text-neutral-400">
                The first link opens the build history, not a direct APK file. Follow the steps
                below to download the artifact from the latest successful run.
              </p>
            </div>

            <aside className="panel-hi relative overflow-hidden p-7 sm:p-8" aria-labelledby="build-status">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-sky-300">
                Current distribution
              </p>
              <h2 id="build-status" className="mt-4 text-2xl font-semibold tracking-tight text-white">
                GitHub Actions artifact
              </h2>
              <p className="mt-4 leading-7 text-neutral-300">
                A permanent public APK release is not currently published in this repository.
                Successful Android builds are uploaded as downloadable artifacts for a limited time.
              </p>
              <dl className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-neutral-400">Artifact name</dt>
                  <dd className="font-mono text-neutral-100">handshake-apk</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-neutral-400">Retention</dt>
                  <dd className="text-right text-neutral-100">30 days per run</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-neutral-400">Source</dt>
                  <dd className="text-right text-neutral-100">Public repository</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section id="install" className="rule-top scroll-mt-24" aria-labelledby="install-heading">
          <div className="site-shell py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="eyebrow">Installation</p>
              <h2 id="install-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Install the test build
              </h2>
              <p className="mt-4 leading-7 text-neutral-400">
                The Android package is distributed inside a ZIP artifact. Make sure you select a
                successful workflow run before downloading it.
              </p>
            </div>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              <li className="border-t border-white/15 pt-5">
                <p className="font-mono text-sm text-sky-300">01 / BUILD</p>
                <h3 className="mt-3 text-lg font-semibold text-white">Choose a successful run</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-400">
                  Open the Android APK workflow and select the newest run with a successful status.
                  Check the commit before you rely on the build for testing.
                </p>
              </li>
              <li className="border-t border-white/15 pt-5">
                <p className="font-mono text-sm text-sky-300">02 / DOWNLOAD</p>
                <h3 className="mt-3 text-lg font-semibold text-white">Extract the artifact</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-400">
                  Download <code className="font-mono text-neutral-200">handshake-apk</code> from
                  the run&rsquo;s Artifacts section, extract the ZIP, and locate the APK file. Artifacts
                  expire 30 days after the workflow run.
                </p>
              </li>
              <li className="border-t border-white/15 pt-5">
                <p className="font-mono text-sm text-sky-300">03 / INSTALL</p>
                <h3 className="mt-3 text-lg font-semibold text-white">Install on Android</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-400">
                  Open the APK on your phone and follow Android&rsquo;s prompts. If needed, permit
                  installation from the browser or file manager you used. Only install a build you
                  trust.
                </p>
              </li>
            </ol>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href={ANDROID_WORKFLOW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cta cta-accent"
              >
                Open Android APK workflow
                <ArrowIcon />
              </a>
              <Link href="/demo" className="cta cta-ghost">
                Explore the pairing demo
              </Link>
            </div>
          </div>
        </section>

        <section className="rule-top" aria-labelledby="limits-heading">
          <div className="site-shell grid gap-8 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <p className="eyebrow">Important limits</p>
              <h2 id="limits-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Know what the prototype can confirm.
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-neutral-300">
              <p>
                Handshake is not a voice-cloning detector. The current Android build does not
                automatically receive remote audio from ordinary carrier calls or third-party
                calling apps such as WhatsApp or Google Meet.
              </p>
              <p>
                An overlay, a call-state event, or a pressure-analysis result is not identity proof.
                A trusted state requires evidence from the supported trust flow; when evidence is
                missing, verify through a separate communication channel you already trust.
              </p>
              <p>
                Do not rely on this prototype as a production security boundary or as the sole basis
                for sending money or sharing sensitive information.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="site-shell flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/" className="text-neutral-400 transition hover:text-white">Home</Link>
            <Link href="/demo" className="text-neutral-400 transition hover:text-white">Demo</Link>
            <Link href="/first-hour" className="text-neutral-400 transition hover:text-white">After a suspected scam</Link>
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-neutral-400 transition hover:text-white">GitHub</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
