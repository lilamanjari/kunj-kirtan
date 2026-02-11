"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Occasion = {
  id: string;
  name: string;
  slug: string;
};

export default function OccasionsPage() {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    fetch("/api/explore/occasions")
      .then((res) => res.json())
      .then((data) => {
        setOccasions(data.occasions ?? []);
        setHasFetchedOnce(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-6">
        <h1 className="text-xl font-medium">Occasions</h1>

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`occasion-loading-${idx}`}
                  className="h-10 rounded-lg bg-stone-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : occasions.length === 0 && hasFetchedOnce ? (
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
