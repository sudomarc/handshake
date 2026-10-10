import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  className?: string;
}

/** Editorial section heading: mono eyebrow, display title, optional lead. */
export function SectionHeading({ eyebrow, title, lead, id, className = "" }: SectionHeadingProps) {
  return (
    <div id={id} className={`max-w-2xl ${className}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-5 text-balance text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-[2.6rem]">
        {title}
      </h2>
      {lead ? <p className="mt-5 text-lg leading-8 text-neutral-400">{lead}</p> : null}
    </div>
  );
}
