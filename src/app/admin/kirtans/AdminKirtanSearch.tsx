"use client";

import { useEffect, useState } from "react";
import type { AdminLeadSingerOption, AdminTagSummary } from "@/lib/admin/types";

export type AdminKirtanSearchFilters = {
  search: string;
  leadSingerId: string;
  tagIds: string[];
  type: "all" | "MM" | "BHJ" | "HK";
  status: "all" | "published" | "hidden";
  recordedDate: string;
};

export function AdminKirtanSearch({
  filters,
  onChange,
  leadSingers,
  tags,
  tagSearch,
  onTagSearchChange,
  showAdminFilters = true,
  disabled = false,
  className = "",
}: {
  filters: AdminKirtanSearchFilters;
  onChange: (filters: AdminKirtanSearchFilters) => void;
  leadSingers: AdminLeadSingerOption[];
  tags: AdminTagSummary[];
  tagSearch: string;
  onTagSearchChange: (value: string) => void;
  showAdminFilters?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const field = "w-full rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-white/90 px-3 py-2 text-sm text-[#5d433c] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)] disabled:opacity-50";
  const [knownTags, setKnownTags] = useState<Record<string, string>>({});
  useEffect(() => {
    setKnownTags((current) => ({ ...current, ...Object.fromEntries(tags.map((tag) => [tag.id, tag.name])) }));
  }, [tags]);
  const update = (patch: Partial<AdminKirtanSearchFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        value={filters.search}
        onChange={(event) => update({ search: event.target.value })}
        placeholder="Search title, singer, sanga, or sequence"
        aria-label="Search kirtans"
        disabled={disabled}
        className={field}
      />
      <div className="grid grid-cols-2 gap-3">
        <select value={filters.leadSingerId} onChange={(event) => update({ leadSingerId: event.target.value })} aria-label="Filter by lead singer" disabled={disabled} className={field}>
          <option value="">All lead singers</option>
          {leadSingers.map((singer) => <option key={singer.id} value={singer.id}>{singer.display_name}</option>)}
        </select>
        {showAdminFilters ? <select value={filters.type} onChange={(event) => update({ type: event.target.value as AdminKirtanSearchFilters["type"] })} aria-label="Filter by type" disabled={disabled} className={field}>
          <option value="all">All types</option><option value="MM">Maha Mantras</option><option value="BHJ">Bhajans</option><option value="HK">Hari-katha</option>
        </select> : null}
        {showAdminFilters ? <select value={filters.status} onChange={(event) => update({ status: event.target.value as AdminKirtanSearchFilters["status"] })} aria-label="Filter by status" disabled={disabled} className={field}>
          <option value="all">All statuses</option><option value="published">Published</option><option value="hidden">Unpublished</option>
        </select> : null}
        {showAdminFilters ? <input type="date" value={filters.recordedDate} onChange={(event) => update({ recordedDate: event.target.value })} aria-label="Filter by recorded date" disabled={disabled} className={field} /> : null}
      </div>
      <div className="space-y-2">
        <div className={`${field} flex min-h-10 flex-wrap items-center gap-1.5`}>
          {filters.tagIds.map((id) => {
            const tagName = knownTags[id] ?? tags.find((item) => item.id === id)?.name;
            return tagName ? <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#edf2e5] px-2.5 py-1 text-xs font-medium text-[#526b3d]">
              {tagName}
              <button type="button" disabled={disabled} aria-label={`Remove tag ${tagName}`} onClick={() => update({ tagIds: filters.tagIds.filter((tagId) => tagId !== id) })} className="rounded-full px-1 text-sm leading-none hover:bg-[#dce7ce] disabled:opacity-50">×</button>
            </span> : null;
          })}
          <input value={tagSearch} onChange={(event) => onTagSearchChange(event.target.value)} placeholder="Search tags…" aria-label="Search tags" disabled={disabled} className="min-w-32 flex-1 border-0 bg-transparent p-0 text-sm text-[#5d433c] outline-none placeholder:text-[#a47d6d] focus:ring-0 disabled:opacity-50" />
        </div>
        {tagSearch.trim() ? <fieldset disabled={disabled} className="max-h-36 space-y-1 overflow-y-auto rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-white/90 p-2">
          <legend className="sr-only">Tag search results</legend>
          {tags.filter((tag) => !filters.tagIds.includes(tag.id)).map((tag) => <button key={tag.id} type="button" onClick={() => { setKnownTags((current) => ({ ...current, [tag.id]: tag.name })); update({ tagIds: [...filters.tagIds, tag.id] }); onTagSearchChange(""); }} className="block w-full rounded px-2 py-1.5 text-left text-sm text-[#5d433c] hover:bg-[#f7f1e8]">{tag.name}</button>)}
          {!tags.some((tag) => !filters.tagIds.includes(tag.id)) ? <p className="px-2 py-2 text-xs text-[#9b8373]">No matching tags.</p> : null}
        </fieldset> : null}
        {filters.tagIds.length ? <p className="text-xs text-[#8f6c65]">Showing kirtans with any selected tag.</p> : null}
      </div>
    </div>
  );
}
