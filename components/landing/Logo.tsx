import Link from "next/link";

/** Brand mark: two devices joined by a trust connection. */
export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10.5" height="18" rx="3.25" />
      <rect x="18.5" y="7" width="10.5" height="18" rx="3.25" />
      <path d="M8.25 16h6.2" opacity="0.55" />
      <path d="M17.55 16h6.2" opacity="0.55" />
      <circle cx="16" cy="16" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-md text-[1.05rem] font-semibold tracking-tight text-white"
      aria-label="Handshake — home"
    >
      <span className="text-sky-400">
        <Mark />
      </span>
      <span>Handshake</span>
    </Link>
  );
}
