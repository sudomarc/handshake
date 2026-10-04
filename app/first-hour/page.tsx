import { PageShell } from "@/components/PageShell";

const checklist = [
  {
    step: 1,
    title: "Stop all contact",
    description: "Hang up immediately. Do not send any more money or information.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2-2h.01M12 22a10 10 0 110-20a10 10 0 010 20z"
        />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Contact your bank",
    description:
      "Call your bank's fraud line immediately. Ask them to freeze the transaction if possible.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Report to authorities",
    description:
      "File a police report and report to your country's fraud reporting center (e.g., FTC in US, Action Fraud in UK).",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    step: 4,
    title: "Secure your accounts",
    description:
      "Change passwords on any accounts the scammer may have accessed. Enable 2FA everywhere.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    step: 5,
    title: "Monitor your credit",
    description:
      "Place a fraud alert with credit bureaus. Consider a credit freeze if money was taken.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    step: 6,
    title: "Tell someone you trust",
    description: "Don't face this alone. Tell a family member or friend what happened for support.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
        />
      </svg>
    ),
  },
];

export default function FirstHourPage() {
  return (
    <PageShell title="The first hour">
      <div className="section animate-in">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            The first hour
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">
            If money moved, act now
          </h1>
          <p className="text-lg text-neutral-400 max-w-md mx-auto">
            These are the calm steps for the next 60 minutes — in order, no decisions under stress.
          </p>
        </div>

        <div className="space-y-4">
          {checklist.map((item) => (
            <div key={item.step} className="card p-5 flex items-start gap-4 group animate-in">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-semibold text-neutral-50">{item.title}</h3>
                </div>
                <p className="text-neutral-300 leading-7">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5 border-emerald-500/30 bg-emerald-500/5 mt-6">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-emerald-300">Remember</p>
              <p className="text-sm text-emerald-400 mt-1">
                You are not alone. Scammers rely on shame and urgency. Reporting helps stop them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
