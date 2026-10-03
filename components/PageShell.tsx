import type { ReactNode } from "react";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="text-2xl font-semibold tracking-tight">{title}</header>
      {children}
    </main>
  );
}
