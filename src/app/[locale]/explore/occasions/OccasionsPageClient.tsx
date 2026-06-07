"use client";

import SubpageHeader from "@/lib/components/SubpageHeader";
import ExploreBrowseCardList from "@/lib/components/ExploreBrowseCardList";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { buildBucketImageUrl, buildTransformedImageUrl } from "@/lib/media";

type Occasion = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

// Temporary cache-buster during the redesign period. Remove or normalize this
// once the occasion artwork is stable and long-lived caching is restored.
const OCCASION_ART_VERSION = "4";

export default function OccasionsPageClient({
  occasions,
}: {
  occasions: Occasion[];
}) {
  const dictionary = useDictionary();
  const items = occasions.map((occasion) => ({
    id: occasion.id,
    title: occasion.name,
    countText: `${occasion.count} kirtans`,
    imageSrc: buildTransformedImageUrl(
      buildBucketImageUrl(`page-art/${occasion.slug}.png`),
      {
        width: 160,
        height: 160,
        fit: "cover",
        // Pinned during cache troubleshooting; we can likely switch back to
        // `auto` after the design pass and cache reset.
        format: "png",
      },
    )?.concat(`&v=${OCCASION_ART_VERSION}`) ?? null,
    href: `/explore/occasions/${occasion.slug}`,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-5 px-5 py-6">
        <SubpageHeader
          title={undefined}
          subtitle={undefined}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <ExploreBrowseCardList
          items={items}
          emptyMessage={dictionary.explore.noOccasionsFound}
        />
      </main>
    </div>
  );
}
