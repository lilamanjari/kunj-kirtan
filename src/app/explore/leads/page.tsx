"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeadItem } from "@/types/explore";

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900">
      <main className="relative mx-auto max-w-md px-5 py-6 space-y-6">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />
        {/* Header */}
        <header className="space-y-2">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
          >
            Home
          </Link>
          <h1 className="text-2xl font-semibold font-script">Lead singers</h1>
          <p className="text-sm text-stone-500">
            Explore kirtans by the voices that carry them
          </p>
        </header>

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`lead-list-loading-${idx}`}
                  className="h-10 rounded-lg bg-stone-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* Lead list */}
        {!loading && (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/explore/leads/${lead.slug}`}
                  className="
                    flex items-center justify-between px-4 py-3
                    transition
                    hover:bg-rose-50
                    active:bg-rose-100
                  "
                >
                  <span className="text-sm font-medium text-stone-800">
                    {lead.display_name}
                  </span>

                  {/* subtle affordance */}
                  <span className="text-stone-400 text-sm">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
