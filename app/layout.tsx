import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Handshake — Verify the relationship, not the voice",
    template: "%s",
  },
  description:
    "Handshake is an Android prototype for establishing device trust with a short-lived QR invitation and checking the evidence a supported flow can confirm. It does not detect cloned voices or automatically analyze every call.",
  applicationName: "Handshake",
  authors: [{ name: "Handshake", url: "https://github.com/sudomarc/handshake" }],
  creator: "Handshake",
  openGraph: {
    title: "Handshake — Verify the relationship, not the voice",
    description:
      "A cloned voice is not identity proof. Handshake explores a second signal: a trust relationship established between devices in person, with clear limits when evidence is missing.",
    type: "website",
    locale: "en_US",
    siteName: "Handshake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handshake — Verify the relationship, not the voice",
    description:
      "A cloned voice is not identity proof. Handshake explores a second signal: a trust relationship established between devices in person, with clear limits when evidence is missing.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-50">{children}</body>
    </html>
  );
}
