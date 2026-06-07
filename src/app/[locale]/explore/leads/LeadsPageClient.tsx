"use client";

import type { LeadItem } from "@/types/explore";
import SubpageHeader from "@/lib/components/SubpageHeader";
import ExploreBrowseCardList from "@/lib/components/ExploreBrowseCardList";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { buildTransformedImageUrl } from "@/lib/media";

export default function LeadsPageClient({
  leads,
}: {
  leads: LeadItem[];
}) {
  const dictionary = useDictionary();
  const items = leads.map((lead) => ({
    id: lead.id,
    title: lead.display_name,
    countText: `${lead.count} kirtans`,
    imageSrc: buildTransformedImageUrl(lead.image_url, {
      width: 160,
      height: 160,
      fit: "cover",
      format: "auto",
    }),
    fallbackText:
      lead.display_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || null,
    href: `/explore/leads/${lead.slug}`,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader
          title={undefined}
          subtitle={undefined}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <ExploreBrowseCardList
          items={items}
          emptyMessage={dictionary.explore.noLeadSingersFound}
        />
      </main>
    </div>
  );
}
