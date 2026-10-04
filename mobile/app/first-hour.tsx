import { PageShell } from "@/components/PageShell";
import { Body, Card, H2 } from "@/components/ui";

const STEPS = [
  ["Stop all contact", "Hang up immediately. Do not send any more money or information."],
  [
    "Contact your bank",
    "Call your bank's fraud line immediately. Ask them to freeze the transaction if possible.",
  ],
  [
    "Report to authorities",
    "File a police report and report to your country's fraud reporting center (e.g., FTC in US, Action Fraud in UK).",
  ],
  [
    "Secure your accounts",
    "Change passwords on any accounts the scammer may have accessed. Enable 2FA everywhere.",
  ],
  [
    "Monitor your credit",
    "Place a fraud alert with credit bureaus. Consider a credit freeze if money was taken.",
  ],
  [
    "Tell someone you trust",
    "Don't face this alone. Tell a family member or friend what happened for support.",
  ],
] as const;

export default function FirstHour() {
  return (
    <PageShell title="The first hour">
      <Body muted>If you think you were scammed, do these in order.</Body>
      {STEPS.map(([title, desc], i) => (
        <Card key={title}>
          <H2>
            {i + 1}. {title}
          </H2>
          <Body>{desc}</Body>
        </Card>
      ))}
    </PageShell>
  );
}
