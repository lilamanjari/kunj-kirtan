import type { Metadata } from "next";
import HistoryPageClient from "./HistoryPageClient";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import { getSeoCopy } from "@/lib/seoCopy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const seoCopy = getSeoCopy(locale);
  return buildPageMetadata({
    locale,
    route: "/history",
    title: seoCopy.historyTitle,
    description: seoCopy.historyDescription,
    noIndex: true,
  });
}

export default function LocalizedHistoryPage() {
  return <HistoryPageClient />;
}
