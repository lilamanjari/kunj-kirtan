"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";

type LeadResponse = {
  lead: {
    display_name: string;
  };
  kirtans: KirtanSummary[];
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajan" },
] as const;

export default function LeadPage() {
  const { slug } = useParams<{ slug: string }>();

  const [data, setData] = useState<LeadResponse | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MM" | "BHJ">("ALL");

  useEffect(() => {
    fetch(`/api/explore/leads/${slug}`)
      .then((res) => res.json())
      .then(setData);
  }, [slug]);

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <main className="mx-auto max-w-md px-5 py-6">
          <p className="text-sm text-stone-500">Loading kirtans…</p>
        </main>
      </div>
    );
  }

  const visible =
    data.kirtans?.filter((k) =>
      filter === "ALL" ? true : k.type === filter,
    ) ?? [];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Lead singer
          </p>
          <h1 className="text-2xl font-semibold">{data.lead.display_name}</h1>
        </header>

        {/* Filters */}
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  rounded-full px-4 py-1.5 text-xs font-medium transition
                  ${
                    active
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                  }
                `}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Kirtan list */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No kirtans found for this filter.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visible.map((k) => (
                <li
                  key={k.id}
                  className="rounded-xl bg-white px-4 py-3 shadow-sm transition hover:bg-stone-50"
                >
                  <p className="text-sm font-medium truncate">
                    {k.title ?? "Maha Mantra"}
                  </p>

                  <p className="mt-0.5 text-xs text-stone-500 truncate">
                    {k.sanga ? `Recorded in ${k.sanga}` : "Location unknown"}
                  </p>

                  <div className="mt-1 text-[11px] uppercase tracking-wide text-stone-400">
                    {k.type === "MM" ? "Maha Mantra" : "Bhajan"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
