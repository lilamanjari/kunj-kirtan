"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";

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
    fetchWithStatus("/api/explore/occasions")
      .then((res) => res.json())
      .then((data) => {
        setOccasions(data.occasions ?? []);
        setHasFetchedOnce(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900 overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 h-64 w-64 bg-[url('/floral-corner.png')] bg-no-repeat bg-right-top opacity-40"
        style={{
          backgroundSize: "280px auto",
          right: "max(0px, calc(50% - 14rem + 8px))",
        }}
      />
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />
        <header className="space-y-1">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
          >
            Home
          </Link>
          <h1 className="text-2xl font-semibold font-script">Occasions</h1>
        </header>

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
