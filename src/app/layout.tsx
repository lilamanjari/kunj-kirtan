import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/lib/audio/AudioPlayerContext";
import ClientAudioPlayerBar from "@/lib/components/ClientAudioPlayerBar";
import QueueToast from "@/lib/components/QueueToast";
import OfflineBanner from "@/lib/components/OfflineBanner";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kunjkirtan.com"),
  title: "Kunj Kirtan",
  description: "Sacred sounds, lovingly curated.",
  openGraph: {
    title: "Kunj Kirtan",
    description: "Sacred sounds, lovingly curated.",
    url: "https://www.kunjkirtan.com",
    siteName: "Kunj Kirtan",
    images: [
      {
        url: "/og-kunj-kirtan.jpg",
        width: 512,
        height: 512,
        alt: "Sri Caitanya Mahaprabhu and Nityananda dancing in kirtan painting by Syamarani Dasi",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kunj Kirtan",
    description: "Sacred sounds, lovingly curated.",
    images: ["/og-kunj-kirtan.jpg"],
  },
  icons: {
    icon: "/kirtan-icon.svg",
    shortcut: "/kirtan-icon.svg",
    apple: "/kirtan-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased`}
      >
        <AudioPlayerProvider>
          {children}
          <OfflineBanner />
          <QueueToast />
          <Suspense fallback={null}>
            <ClientAudioPlayerBar />
          </Suspense>
        </AudioPlayerProvider>
        <Analytics />
      </body>
    </html>
  );
}
