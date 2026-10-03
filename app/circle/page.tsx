import { CreatePair } from "@/components/CreatePair";
import { PageShell } from "@/components/PageShell";

export default function CirclePage() {
  return (
    <PageShell title="My trusted people">
      <p className="text-lg leading-7 text-neutral-300">
        A trusted person is someone you know in real life — a parent, sibling, partner, or close
        friend. You each get a private code that changes every 30 seconds. Only the two of you can
        see it.
      </p>
      <CreatePair />
    </PageShell>
  );
}
