import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AudioPlayerProvider } from "@/lib/audio/AudioPlayerContext";
import ClientAudioPlayerBar from "@/lib/components/ClientAudioPlayerBar";
import OfflineBanner from "@/lib/components/OfflineBanner";
import QueueToast from "@/lib/components/QueueToast";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, supportedLocales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <AudioPlayerProvider>
        {children}
        <OfflineBanner />
        <QueueToast />
        <Suspense fallback={null}>
          <ClientAudioPlayerBar />
        </Suspense>
      </AudioPlayerProvider>
    </LocaleProvider>
  );
}
