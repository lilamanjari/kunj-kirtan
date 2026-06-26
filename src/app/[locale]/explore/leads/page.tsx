import type { Metadata } from "next";
import LeadsPageClient from "./LeadsPageClient";
import { getLeadsPageData } from "@/lib/server/leadsPage";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import JsonLd from "@/lib/components/JsonLd";
import { buildCollectionPageJsonLd } from "@/lib/structuredData";
import { getSeoCopy } from "@/lib/seoCopy";

export const revalidate = 86400;

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
    route: "/explore/leads",
    title: seoCopy.leadsTitle,
    description: seoCopy.leadsDescription,
  });
}

export default async function LocalizedLeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, error } = await getLeadsPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch lead singers page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <JsonLd
          data={buildCollectionPageJsonLd({
            locale,
            route: "/explore/leads",
            name: seoCopy.leadsTitle,
            description: seoCopy.leadsDescription,
          })}
        />
      ) : null}
      <LeadsPageClient leads={data.leads} />
    </>
  );
}
