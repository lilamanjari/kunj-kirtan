"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function navLinkClassName(isActive: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-[var(--theme-radius-surface)] border px-5 py-3 text-[1.02rem] font-medium shadow-[0_12px_28px_rgba(146,107,79,0.08)] transition",
    isActive
      ? "z-10 border-[rgba(99,127,77,0.72)] bg-[linear-gradient(180deg,rgba(115,145,85,0.96)_0%,rgba(93,120,80,0.96)_100%)] text-[#fffdf7] shadow-[0_14px_32px_rgba(93,120,80,0.24)]"
      : "z-0 border-[color:var(--theme-page-home-discovery-gold)] bg-[rgba(255,253,250,0.96)] text-[#75584d] hover:bg-[#fff8f2]",
  ].join(" ");
}

function KirtansIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="currentColor"
    >
      <path d="M16.5 3.5a1 1 0 0 1 1 1v9.12a3.75 3.75 0 1 1-1.5-3V8.1l-6 1.4v6.12a3.75 3.75 0 1 1-1.5-3V6.9a1 1 0 0 1 .77-.97l7.23-1.69Z" />
    </svg>
  );
}

function TagsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13 11 22l-8-8 9-9h6l2 2v6Z" />
      <circle cx="15.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SangasIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="2.2" />
      <circle cx="6.5" cy="10" r="1.7" />
      <circle cx="17.5" cy="10" r="1.7" />
      <path d="M8.7 17.5c.6-2 2-3 3.3-3s2.7 1 3.3 3" />
      <path d="M3.8 17.4c.4-1.5 1.4-2.3 2.7-2.3.8 0 1.5.3 2.1.9" />
      <path d="M20.2 17.4c-.4-1.5-1.4-2.3-2.7-2.3-.8 0-1.5.3-2.1.9" />
    </svg>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#fff3ec_52%,#f8ede7_100%)] text-[#5e433a]">
      <div className="mx-auto flex h-screen max-h-screen w-full max-w-[1600px] flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-5 rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-[linear-gradient(180deg,rgba(255,251,247,0.96)_0%,rgba(255,248,242,0.94)_100%)] px-6 py-4 shadow-[0_20px_48px_rgba(170,118,91,0.13)] backdrop-blur-md">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--theme-radius-surface)] bg-[radial-gradient(circle_at_50%_38%,rgba(255,253,250,0.98)_0%,rgba(251,242,234,0.96)_72%,rgba(245,231,220,0.98)_100%)] shadow-[0_12px_28px_rgba(194,146,104,0.14)]">
                <Image
                  src="/admin-lotus.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[1.15rem] uppercase tracking-[0.18em] text-[#6f5146] sm:text-[1.32rem]">
                  Kunj Kirtans CMS
                </p>
                <h1 className="font-display text-[1.1rem] leading-tight text-[#6c4a3f] sm:text-[1.1rem]">
                  Metadata Editor
                </h1>
              </div>
            </div>

            <nav className="justify-self-center">
              <div className="inline-flex items-center">
                <Link
                  href="/admin/kirtans"
                  className={navLinkClassName(
                    pathname.startsWith("/admin/kirtans"),
                  )}
                  style={{ marginRight: "-1px" }}
                >
                  <KirtansIcon />
                  <span className="font-display text-[1.14rem]">Kirtans</span>
                </Link>
                <Link
                  href="/admin/tags"
                  className={navLinkClassName(
                    pathname.startsWith("/admin/tags"),
                  )}
                  style={{ marginLeft: "-1px" }}
                >
                  <TagsIcon />
                  <span className="font-display text-[1.14rem]">Tags</span>
                </Link>
                <Link
                  href="/admin/sangas"
                  className={navLinkClassName(
                    pathname.startsWith("/admin/sangas"),
                  )}
                  style={{ marginLeft: "-1px" }}
                >
                  <SangasIcon />
                  <span className="font-display text-[1.14rem]">Sangas</span>
                </Link>
              </div>
            </nav>

            <div aria-hidden="true" className="justify-self-end h-14 w-14" />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
