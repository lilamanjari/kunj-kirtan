"use client";

import { useCallback, useEffect, useState } from "react";
import { featureStatus, toLocalDateTime, type AdminFeature } from "@/lib/admin/features";
import DateTimePicker from "./DateTimePicker";
import { AdminKirtanSearch, type AdminKirtanSearchFilters } from "@/app/admin/kirtans/AdminKirtanSearch";
import type { AdminKirtanListItem, AdminLeadSingerOption, AdminTagSummary } from "@/lib/admin/types";

const panel = "rounded-[var(--theme-radius-surface)] border border-[#e7d7c8] bg-[rgba(255,253,249,0.94)] p-6 shadow-[0_14px_36px_rgba(130,90,61,0.06)]";
const field = "w-full rounded-xl border border-[#e5d5c7] bg-white px-4 py-3 text-sm text-[#654d43] outline-none transition focus:border-[#8fa777] focus:ring-2 focus:ring-[#e9efdf] disabled:opacity-50";
const primary = "rounded-xl bg-[#718c55] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#607b48] disabled:cursor-wait disabled:opacity-60";
const secondary = "rounded-xl border border-[#e5d5c7] bg-white/80 px-4 py-2 text-sm font-medium text-[#87675d] transition hover:bg-[#f7f1e8] disabled:opacity-50";

type KirtanChoice = { id: string; label: string };
type ScheduledKirtan = AdminFeature & { kirtan_name: string };
type Overview = { features: ScheduledKirtan[]; kirtans: KirtanChoice[] };
type Draft = { kirtanId: string; start: string; end: string };
const emptyFilters: AdminKirtanSearchFilters = { search: "", leadSingerId: "", tagIds: [], type: "all", status: "published", recordedDate: "" };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json;
}

function defaultDayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toLocalDateTime(start), end: toLocalDateTime(end) };
}

export default function FeaturedKirtanScheduler() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [timezone, setTimezone] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [tagSearch, setTagSearch] = useState("");
  const [leadSingers, setLeadSingers] = useState<AdminLeadSingerOption[]>([]);
  const [tags, setTags] = useState<AdminTagSummary[]>([]);
  const [matches, setMatches] = useState<AdminKirtanListItem[]>([]);

  const load = useCallback(async () => {
    const result = await requestJson("/api/admin/featured-kirtans") as Overview;
    setOverview(result);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let disposed = false;
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    void requestJson("/api/admin/featured-kirtans").then((result: Overview) => {
      if (disposed) return;
      setOverview(result);
      setNow(Date.now());
    }).catch((reason: Error) => { if (!disposed) setError(reason.message); });
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let disposed = false;
    const params = new URLSearchParams({ publishedOnly: "true" });
    if (tagSearch.trim()) params.set("search", tagSearch.trim());
    void Promise.all([
      requestJson("/api/admin/kirtans/options"),
      requestJson(`/api/admin/tags?${params.toString()}`),
    ]).then(([options, tagResult]) => {
      if (disposed) return;
      setLeadSingers(options.leadSingers ?? []);
      setTags(tagResult.tags ?? []);
    }).catch((reason: Error) => { if (!disposed) setError(reason.message); });
    return () => { disposed = true; };
  }, [tagSearch]);

  const pickerOpen = draft !== null;
  useEffect(() => {
    if (!pickerOpen) return;
    let disposed = false;
    const params = new URLSearchParams({ status: "published" });
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.leadSingerId) params.set("leadSingerId", filters.leadSingerId);
    filters.tagIds.forEach((id) => params.append("tagId", id));
    void requestJson(`/api/admin/kirtans?${params.toString()}`).then((result) => {
      if (disposed) return;
      const playableIds = new Set(overview?.kirtans.map((kirtan) => kirtan.id) ?? []);
      setMatches((result.kirtans ?? []).filter((kirtan: AdminKirtanListItem) => playableIds.has(kirtan.id)));
    }).catch((reason: Error) => { if (!disposed) setError(reason.message); });
    return () => { disposed = true; };
  }, [pickerOpen, filters, overview]);

  const refreshHomepage = async () => {
    setWarning("");
    try {
      await requestJson("/api/admin/features/refresh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "revalidate" }),
      });
      await requestJson("/api/admin/features/refresh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "warm" }),
      });
    } catch (reason) {
      setWarning(`Your change is saved. ${reason instanceof Error ? reason.message : "The homepage could not be refreshed."}`);
    }
  };

  const createDraft = () => {
    const window = defaultDayWindow();
    setFilters(emptyFilters);
    setDraft({ kirtanId: "", ...window });
    setError("");
    setWarning("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || busy) return;
    setError("");
    setBusy(true);
    try {
      const start = new Date(draft.start), end = new Date(draft.end);
      if (!draft.kirtanId) throw new Error("Choose a kirtan to feature.");
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= new Date()) {
        throw new Error("End at must be in the future and after Start at.");
      }
      if (toLocalDateTime(start) !== draft.start || toLocalDateTime(end) !== draft.end) {
        throw new Error("That time does not exist in your time zone. Choose another time.");
      }
      await requestJson("/api/admin/featured-kirtans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kirtanId: draft.kirtanId, startsAt: start.toISOString(), endsAt: end.toISOString() }),
      });
      setDraft(null);
      await load();
      await refreshHomepage();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not schedule kirtan");
    } finally {
      setBusy(false);
    }
  };

  const endFeature = async (feature: ScheduledKirtan) => {
    const current = featureStatus(feature, now ?? 0) === "current";
    if (busy || !window.confirm(`${current ? "Stop featuring" : "Cancel"} “${feature.kirtan_name}”?`)) return;
    setEnding(feature.id);
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/featured-kirtans/${feature.id}`, { method: "DELETE" });
      await load();
      await refreshHomepage();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not end featured kirtan");
    } finally {
      setEnding(null);
      setBusy(false);
    }
  };

  const format = (value: string | null, fallback: string) => value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : fallback;
  const features = overview?.features ?? [];
  const active = features.filter((feature) => featureStatus(feature, now ?? 0) === "current");
  const scheduled = features.filter((feature) => featureStatus(feature, now ?? 0) === "scheduled");

  return (
    <section className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-[#6c4a3f]">Main feature kirtan</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#a47d6d]">Schedule a published kirtan for a specific period. It replaces the homepage’s usual featured pick while active.</p>
        </div>
        <button type="button" disabled={busy || !overview?.kirtans.length} className={primary} onClick={createDraft}>Schedule kirtan</button>
      </div>
      <p className="mb-4 text-xs text-[#a18b7b]">Dates and times use {timezone || "your local time zone"}. For a full day, set the end to midnight at the start of the following day.</p>
      {error ? <p role="alert" className="mb-3 rounded-xl border border-[#e9cfc4] bg-[#fff5ef] p-3 text-sm text-[#a45e5a]">{error}</p> : null}
      {warning ? <p role="alert" className="mb-3 rounded-xl border border-[#e8d6a8] bg-[#fff9e9] p-3 text-sm text-[#9b7d42]">{warning}</p> : null}
      {!overview ? <p className="py-4 text-sm text-[#a47d6d]">{error ? "Featured kirtans could not be loaded." : "Loading kirtans…"}</p> : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {active.map((feature) => (
              <article key={feature.id} className={`${panel} border-[#cbd9b8] bg-[linear-gradient(125deg,#f4f7ed,#fffdf8)]`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#819369]">On the homepage now</p>
                <h3 className="font-display text-xl text-[#644b40]">{feature.kirtan_name}</h3>
                <p className="mt-3 text-xs text-[#9b8373]">{format(feature.starts_at, "Already started")} → {format(feature.ends_at, "No end date")}<br />{timezone}</p>
                <button type="button" disabled={busy} onClick={() => void endFeature(feature)} className={`${secondary} mt-4`}>{ending === feature.id ? "Stopping…" : "Stop featuring"}</button>
              </article>
            ))}
            {!active.length ? <div className={panel}><h3 className="font-display text-lg text-[#826b59]">Using the usual featured pick</h3><p className="mt-1 text-sm text-[#a18b7b]">A scheduled kirtan will take over during its selected period.</p></div> : null}
            {scheduled.length ? <div className="space-y-3"><h3 className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a47d6d]">Upcoming kirtans</h3>{scheduled.map((feature) => (
              <article key={feature.id} className={panel}>
                <h3 className="font-display text-lg text-[#644b40]">{feature.kirtan_name}</h3>
                <p className="mt-3 text-xs text-[#9b8373]">{format(feature.starts_at, "Already started")} → {format(feature.ends_at, "No end date")}<br />{timezone}</p>
                <button type="button" disabled={busy} onClick={() => void endFeature(feature)} className={`${secondary} mt-4`}>{ending === feature.id ? "Cancelling…" : "Cancel schedule"}</button>
              </article>
            ))}</div> : null}
          </div>
          {draft ? (
            <form onSubmit={save} className={`${panel} space-y-4`}>
              <div className="flex items-center justify-between"><h3 className="font-display text-xl text-[#6c4a3f]">Schedule a kirtan</h3><button type="button" disabled={busy} onClick={() => setDraft(null)} className="text-sm text-[#a18b7b]">Cancel</button></div>
              <div>
                <p className="mb-2 text-sm font-medium text-[#87675d]">Find a published kirtan</p>
                <AdminKirtanSearch filters={filters} onChange={setFilters} leadSingers={leadSingers} tags={tags} tagSearch={tagSearch} onTagSearchChange={setTagSearch} showAdminFilters={false} disabled={busy} />
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#e5d5c7] bg-white/70 p-2">
                  {matches.map((kirtan) => <button key={kirtan.id} type="button" disabled={busy} onClick={() => setDraft({ ...draft, kirtanId: kirtan.id })} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${draft.kirtanId === kirtan.id ? "bg-[#edf2e5] text-[#526b3d]" : "text-[#654d43] hover:bg-[#f7f1e8]"}`}><span className="font-medium">{kirtan.title}</span><span className="block text-xs text-[#9b8373]">{kirtan.lead_singer ?? "Unknown singer"}</span></button>)}
                  {!matches.length ? <p className="px-3 py-4 text-sm text-[#9b8373]">No kirtans match these filters.</p> : null}
                </div>
                {draft.kirtanId ? <p className="mt-2 text-xs text-[#718c55]">Selected: {matches.find((item) => item.id === draft.kirtanId)?.title ?? overview.kirtans.find((item) => item.id === draft.kirtanId)?.label ?? "Kirtan selected"}</p> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><DateTimePicker label="Start at" value={draft.start} disabled={busy} onChange={(start) => setDraft({ ...draft, start })} /><DateTimePicker label="Ends at" value={draft.end} disabled={busy} onChange={(end) => setDraft({ ...draft, end })} /></div>
              <button type="submit" disabled={busy || !draft.kirtanId} className={`${primary} w-full`}>{busy ? "Saving…" : "Schedule featured kirtan"}</button>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}
