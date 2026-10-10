import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

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

const linkClass = "text-neutral-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 focus-visible:outline-offset-4";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080a]">
      <div className="site-shell grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:gap-x-10 sm:py-14 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
        <div className="col-span-2 max-w-sm lg:col-span-1">
          <Logo />
          <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-sky-200">
            Trusted relationships · Android
          </p>
          <p className="mt-3 max-w-xs text-sm leading-7 text-neutral-400">
            A verification-first prototype for slowing down high-pressure calls and giving people
            a reason to pause when identity is not confirmed.
          </p>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Built for experimentation. Not a certified security product.
          </p>
          <Link href="/download" className="cta cta-accent mt-6 w-full min-[420px]:w-auto">
            Get the Android app
            <ArrowIcon />
          </Link>
        </div>

        <nav aria-label="Footer: product" className="flex flex-col items-start gap-3 text-sm">
          <h2 className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-neutral-300">
            Product
          </h2>
          <Link href="/download" className={linkClass}>
            Download Android app
          </Link>
          <Link href="/circle" className={linkClass}>
            Trusted pairing
          </Link>
          <Link href="/analyze" className={linkClass}>
            Pressure Check
          </Link>
          <Link href="/first-hour" className={linkClass}>
            The first hour
          </Link>
        </nav>

        <nav aria-label="Footer: explore" className="flex flex-col items-start gap-3 text-sm">
          <h2 className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-neutral-300">
            Explore
          </h2>
          <Link href="/#how-it-works" className={linkClass}>
            How it works
          </Link>
          <Link href="/#trust-states" className={linkClass}>
            Trust states
          </Link>
          <Link href="/#faq" className={linkClass}>
            FAQs
          </Link>
          <Link href="/demo" className={linkClass}>
            Demo flow
          </Link>
        </nav>

        <nav aria-label="Footer: project" className="flex flex-col items-start gap-3 text-sm">
          <h2 className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-neutral-300">
            Project
          </h2>
          <a href="https://github.com/sudomarc/handshake" className={linkClass}>
            Source code
          </a>
          <a href="https://github.com/sudomarc/handshake/blob/main/ARCHITECTURE.md" className={linkClass}>
            Architecture
          </a>
          <a href="https://github.com/sudomarc/handshake/blob/main/SECURITY.md" className={linkClass}>
            Security notes
          </a>
          <a href="https://github.com/sudomarc/handshake/issues/new" className={linkClass}>
            Report an issue
          </a>
        </nav>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="site-shell flex flex-col gap-3 py-5 text-xs leading-5 text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Handshake · Independent Android-first prototype</p>
          <p className="max-w-2xl sm:text-right">
            No cloned-voice detection or remote call-audio analysis in this release.
          </p>
        </div>
      </div>
    </footer>
  );
}
