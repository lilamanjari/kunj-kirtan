"use client";

import SubpageHeader from "@/lib/components/SubpageHeader";
import BrowseLinkList from "@/lib/components/BrowseLinkList";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type Occasion = {
  id: string;
  name: string;
  slug: string;
};

export default function OccasionsPageClient({
  occasions,
}: {
  occasions: Occasion[];
}) {
  const dictionary = useDictionary();
  const items = occasions.map((occasion) => ({
    id: occasion.id,
    title: occasion.name,
    href: `/explore/occasions/${occasion.slug}`,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader
          title={dictionary.explore.occasions}
          subtitle={dictionary.explore.occasionsSubtitle}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <BrowseLinkList
          items={items}
          emptyMessage={dictionary.explore.noOccasionsFound}
        />
      </main>
    </div>
  );
}
