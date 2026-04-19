"use client";

import Link from "next/link";

type BrowseLinkItem = {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
};

type BrowseLinkListProps = {
  items: BrowseLinkItem[];
  emptyMessage: string;
};

const BROWSE_TINTS = [
  {
    border: "rgba(228, 185, 192, 0.82)",
    background:
      "linear-gradient(135deg, rgba(255,250,248,0.98) 0%, rgba(252,236,239,0.98) 100%)",
  },
  {
    border: "rgba(220, 195, 172, 0.82)",
    background:
      "linear-gradient(135deg, rgba(255,251,247,0.98) 0%, rgba(246,234,244,0.98) 100%)",
  },
] as const;

export default function BrowseLinkList({
  items,
  emptyMessage,
}: BrowseLinkListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-white/80 px-4 py-8 text-center text-sm text-stone-500 shadow-[0_12px_28px_rgba(120,53,15,0.08)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const tint = BROWSE_TINTS[index % BROWSE_TINTS.length];

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-4 rounded-xl border px-4 py-4 shadow-[0_18px_34px_rgba(84,38,27,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(84,38,27,0.16)]"
              style={{
                borderColor: tint.border,
                background: tint.background,
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.05rem] font-medium text-stone-900">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="mt-1 truncate text-sm text-stone-600">
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(167,110,93,0.22)] bg-white/82 text-lg text-[rgb(147,96,81)] shadow-[0_8px_18px_rgba(84,38,27,0.12)] backdrop-blur-sm transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
