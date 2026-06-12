import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kunjkirtans.com"),
  title: "Kunj Kirtans",
  description: "Sacred sounds, lovingly curated.",
  openGraph: {
    title: "Kunj Kirtans",
    description: "Sacred sounds, lovingly curated.",
    url: "https://www.kunjkirtans.com",
    siteName: "Kunj Kirtans",
    images: [
      {
        url: "/KunjKirtansMainHeader.png",
        width: 512,
        height: 512,
        alt: "Sri Caitanya Mahaprabhu and Nityananda dancing in kirtan painting by Syamarani Dasi",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kunj Kirtans",
    description: "Sacred sounds, lovingly curated.",
    images: ["/KunjKirtansMainHeader.png"],
  },
  icons: {
    icon: "/kirtan-icon.svg",
    shortcut: "/kirtan-icon.svg",
    apple: "/kirtan-icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cormorantGaramond.variable} antialiased`}
      >
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  );
}
