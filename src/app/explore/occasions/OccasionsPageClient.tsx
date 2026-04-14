"use client";

import Link from "next/link";
import SubpageHeader from "@/lib/components/SubpageHeader";

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
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader title="Occasions" backLabel="Home" backHref="/" />

        {occasions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
            No occasions found.
          </div>
        ) : (
          <ul className="space-y-3">
            {occasions.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/explore/occasions/${o.slug}`}
                  className="block rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-stone-50 transition"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
