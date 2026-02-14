import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/lib/audio/AudioPlayerContext";
import AudioPlayerBar from "@/lib/components/AudioPlayerBar";
import QueueToast from "@/lib/components/QueueToast";

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
  title: "Kunj Kirtan",
  description: "Sacred sounds, lovingly curated.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased pb-24`}
      >
        <AudioPlayerProvider>
          {children}
          <QueueToast />
          <AudioPlayerBar />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
