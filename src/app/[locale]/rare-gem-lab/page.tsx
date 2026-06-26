import type { Metadata } from "next";
import RareGemLabPage from "./RareGemLabPage";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import { getSeoCopy } from "@/lib/seoCopy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const seoCopy = getSeoCopy(locale);

  return buildPageMetadata({
    locale,
    route: "/rare-gem-lab",
    title: seoCopy.rareGemLabTitle,
    description: seoCopy.rareGemLabDescription,
    noIndex: true,
  });
}

export default function LocalizedRareGemLabPage() {
  return <RareGemLabPage />;
}
