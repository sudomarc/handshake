import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const links = [
  { href: "/circle", label: "Your circle", hint: "Create a trusted pair" },
  { href: "/analyze", label: "Pressure check", hint: "See what a message is trying to do" },
  { href: "/challenge", label: "Personal question", hint: "Only you could answer it" },
  { href: "/first-hour", label: "The first hour", hint: "Money already moved? Calm steps." },
] as const;

export default function Home() {
  return (
    <PageShell title="Handshake">
      <p className="text-lg leading-7 text-neutral-300">
        The voice can be cloned. The person can still prove who they are.
      </p>
      <nav className="flex flex-col gap-3" aria-label="Main">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="block text-lg font-medium">{link.label}</span>
            <span className="mt-1 block text-sm text-neutral-400">{link.hint}</span>
          </Link>
        ))}
      </nav>
      <p className="text-sm text-neutral-500">
        “Verify a call” and “My codes” open with a pair code — coming soon.
      </p>
    </PageShell>
  );
}
