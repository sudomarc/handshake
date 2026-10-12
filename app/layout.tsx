import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const siteUrl = "https://handshake-patrickk2s-projects.vercel.app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Handshake by Sudomarc — Verify the relationship, not the voice",
    template: "%s | Handshake",
  },
  description:
    "Handshake is an Android-first trust and verification prototype created by Sudomarc. Explore trusted-device pairing and safer decisions during high-pressure calls. It does not detect cloned voices or analyze remote call audio.",
  applicationName: "Handshake",
  alternates: {
    canonical: "/",
  },
  authors: [
    { name: "Sudomarc", url: "https://github.com/sudomarc" },
    { name: "Handshake", url: "https://github.com/sudomarc/handshake" },
  ],
  creator: "Sudomarc",
  publisher: "Handshake",
  keywords: [
    "Handshake",
    "Sudomarc",
    "Sudomarc developer",
    "Android trust app",
    "trusted-device pairing",
    "call verification",
    "ForgeHacks 2026",
  ],
  openGraph: {
    title: "Handshake by Sudomarc — Verify the relationship, not the voice",
    description:
      "Handshake is an Android-first trust and verification prototype created by Sudomarc. Set up trusted relationships in advance and pause when a session cannot be confirmed.",
    url: siteUrl,
    type: "website",
    locale: "en_US",
    siteName: "Handshake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handshake by Sudomarc — Verify the relationship, not the voice",
    description:
      "An Android-first trust and verification prototype created by Sudomarc. Learn what Handshake currently supports and its limitations.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://github.com/sudomarc#person",
      name: "Sudomarc",
      url: "https://github.com/sudomarc",
      sameAs: ["https://github.com/sudomarc"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": siteUrl + "/#software",
      name: "Handshake",
      url: siteUrl,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Android",
      description:
        "An Android-first prototype for trusted-device pairing and verification guidance during high-pressure calls. It does not detect cloned voices or analyze remote call audio.",
      creator: { "@id": "https://github.com/sudomarc#person" },
      codeRepository: "https://github.com/sudomarc/handshake",
    },
    {
      "@type": "WebSite",
      "@id": siteUrl + "/#website",
      url: siteUrl,
      name: "Handshake by Sudomarc",
      alternateName: "Handshake",
      creator: { "@id": "https://github.com/sudomarc#person" },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={geistSans.variable + " " + geistMono.variable + " " + instrumentSerif.variable + " h-full antialiased"}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
