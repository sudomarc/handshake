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
    default: "Handshake — Device-level trust for phone calls",
    template: "%s",
  },
  description:
    "Voice cloning can make a fake sound real. Handshake pairs the phones of the people you trust — once, in person, with a QR scan — then recognizes the paired device during calls and shows one honest state: Trusted, Verify, or Risk.",
  applicationName: "Handshake",
  authors: [{ name: "Handshake", url: "https://github.com/sudomarc/handshake" }],
  creator: "Handshake",
  openGraph: {
    title: "Handshake — Device-level trust for phone calls",
    description:
      "The voice can be cloned. The person can still prove who they are. Pair two trusted phones once, and recognize the difference during every call.",
    type: "website",
    locale: "en_US",
    siteName: "Handshake",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handshake — Device-level trust for phone calls",
    description:
      "The voice can be cloned. The person can still prove who they are. Pair two trusted phones once, and recognize the difference during every call.",
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
