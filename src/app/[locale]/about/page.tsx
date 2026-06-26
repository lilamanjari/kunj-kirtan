import type { Metadata } from "next";
import AboutPageContent from "./AboutPageContent";
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
    route: "/about",
    title: seoCopy.aboutTitle,
    description: seoCopy.aboutDescription,
  });
}

export default function LocalizedAboutPage() {
  return <AboutPageContent />;
}
