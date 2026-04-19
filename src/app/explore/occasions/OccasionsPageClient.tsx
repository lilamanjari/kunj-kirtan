"use client";

import SubpageHeader from "@/lib/components/SubpageHeader";
import BrowseLinkList from "@/lib/components/BrowseLinkList";

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
  const items = occasions.map((occasion) => ({
    id: occasion.id,
    title: occasion.name,
    href: `/explore/occasions/${occasion.slug}`,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader
          title="Occasions"
          subtitle="Browse kirtans by festival or sacred calendar mood"
          backLabel="Home"
          backHref="/"
        />

        <BrowseLinkList items={items} emptyMessage="No occasions found." />
      </main>
    </div>
  );
}
