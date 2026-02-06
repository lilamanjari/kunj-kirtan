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
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-medium">Lead singers</h1>
          <p className="text-sm text-stone-500">
            Explore kirtans by the voices that carry them
          </p>
        </header>

        {/* Loading state */}
        {loading && (
          <div className="text-sm text-stone-500">Loading lead singers…</div>
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
                    hover:bg-stone-50
                    active:bg-stone-100
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
