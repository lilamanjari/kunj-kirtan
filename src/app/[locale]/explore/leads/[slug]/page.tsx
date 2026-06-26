import type { Metadata } from "next";
import LeadPageClient from "./LeadPageClient";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { getLeadPageData } from "@/lib/server/leadPage";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import JsonLd from "@/lib/components/JsonLd";
import {
  buildBreadcrumbJsonLd,
  buildProfilePageJsonLd,
} from "@/lib/structuredData";
import { getSeoCopy } from "@/lib/seoCopy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const seoCopy = getSeoCopy(locale);

  const { data, status } = await getLeadPageData(slug);

  if (status === 404 || !data) {
    return buildPageMetadata({
      locale,
      route: `/explore/leads/${slug}`,
      title: seoCopy.leadFallbackTitle,
      description: seoCopy.leadFallbackDescription,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    locale,
    route: `/explore/leads/${slug}`,
    title: data.lead.display_name,
    description: seoCopy.leadPageDescription(data.lead.display_name),
    image: data.lead.image_url ?? undefined,
  });
}

export default async function LocalizedLeadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { data, status, error } = await getLeadPageData(slug);

  if (status === 404) {
    notFound();
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
        <main className="relative z-10 mx-auto max-w-md space-y-8 px-5 py-6">
          <SubpageHeader title="Lead singer" backLabel="Leads" backHref="/explore/leads" />
          <div className="rounded-[1.75rem] border border-[#ead8d2] bg-white/90 px-6 py-8 shadow-[0_18px_40px_rgba(154,88,68,0.14)]">
            <h2 className="text-lg font-semibold text-stone-800">
              This page could not be loaded right now.
            </h2>
            <p className="mt-2 text-sm text-stone-600">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    throw new Error("Failed to fetch lead page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <>
          <JsonLd
            data={buildProfilePageJsonLd({
              locale,
              route: `/explore/leads/${slug}`,
              name: data.lead.display_name,
              description: seoCopy.leadPageDescription(data.lead.display_name),
              image: data.lead.image_url ?? undefined,
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd(locale, [
              { name: seoCopy.homeBreadcrumb, route: "/" },
              { name: seoCopy.leadsTitle, route: "/explore/leads" },
              { name: data.lead.display_name, route: `/explore/leads/${slug}` },
            ])}
          />
        </>
      ) : null}
      <LeadPageClient key={slug} slug={slug} initialData={data} />
    </>
  );
}
