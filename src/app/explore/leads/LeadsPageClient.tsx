"use client";

import Link from "next/link";
import type { LeadItem } from "@/types/explore";
import SubpageHeader from "@/lib/components/SubpageHeader";

export default function LeadsPageClient({
  leads,
}: {
  leads: LeadItem[];
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader
          title="Lead singers"
          subtitle="Explore kirtans by the voices that carry them"
          backLabel="Home"
          backHref="/"
        />

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
                <span className="text-stone-400 text-sm">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
