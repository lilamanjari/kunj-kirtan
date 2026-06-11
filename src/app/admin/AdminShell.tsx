"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function navLinkClassName(isActive: boolean) {
  return [
    "rounded-[var(--theme-radius-button)] border px-4 py-2 text-sm font-medium transition",
    isActive
      ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)] text-[color:var(--theme-player-green)] shadow-[0_10px_24px_rgba(121,161,79,0.18)]"
      : "border-[#ebd8ce] bg-white/80 text-[#85645d] hover:bg-[#fff7f3]",
  ].join(" ");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#fff3ec_52%,#f8ede7_100%)] text-[#5e433a]">
      <div className="mx-auto flex h-screen max-h-screen w-full max-w-[1600px] flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-5 flex items-center justify-between rounded-[var(--theme-radius-surface)] border border-[#f0ddd3] bg-[rgba(255,250,246,0.88)] px-4 py-3 shadow-[0_18px_44px_rgba(170,118,91,0.15)] backdrop-blur-md">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b18472]">
              Kunj Kirtans CMS
            </p>
            <h1 className="text-lg font-semibold text-[#5f4338]">
              Metadata Editor
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/admin/kirtans"
              className={navLinkClassName(
                pathname.startsWith("/admin/kirtans"),
              )}
            >
              Kirtans
            </Link>
            <Link
              href="/admin/tags"
              className={navLinkClassName(pathname.startsWith("/admin/tags"))}
            >
              Tags
            </Link>
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
