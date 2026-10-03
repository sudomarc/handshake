import { CreatePair } from "@/components/CreatePair";
import { PageShell } from "@/components/PageShell";

export default function CirclePage() {
  return (
    <PageShell title="Your circle">
      <p className="text-lg leading-7 text-neutral-300">
        A trusted pair is a private line between you and one person you trust. Both of you get a
        short code that changes every 30 seconds — only the two of you can read it.
      </p>
      <CreatePair />
    </PageShell>
  );
}
