"use client";

import { useCallback, useEffect, useState } from "react";
import { featureStatus, oneMonthAfter, toLocalDateTime, type AdminFeature, type FeatureOverview } from "@/lib/admin/features";
import DateTimePicker from "./DateTimePicker";
import CacheRefreshPanel from "./CacheRefreshPanel";

const panel = "rounded-[var(--theme-radius-surface)] border border-[#e7d7c8] bg-[rgba(255,253,249,0.94)] p-6 shadow-[0_14px_36px_rgba(130,90,61,0.06)]";
const field = "w-full rounded-xl border border-[#e5d5c7] bg-white px-4 py-3 text-sm text-[#654d43] outline-none transition focus:border-[#8fa777] focus:ring-2 focus:ring-[#e9efdf] disabled:opacity-50";
const primary = "rounded-xl bg-[#718c55] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#607b48] disabled:cursor-wait disabled:opacity-60";
const secondary = "rounded-xl border border-[#e5d5c7] bg-white/80 px-4 py-2 text-sm font-medium text-[#87675d] transition hover:bg-[#f7f1e8] disabled:opacity-50";
type Draft = { id?: string; occasionId: string; title: string; subtitle: string; start: string; end: string };
type Progress = "idle" | "saving" | "revalidate" | "warm" | "done" | "warning";

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json;
}

export default function FeatureCmsPage() {
  const [overview, setOverview] = useState<FeatureOverview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [timezone, setTimezone] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [progress, setProgress] = useState<Progress>("idle");
  const [cacheBusy, setCacheBusy] = useState(false);
  const featureBusy = progress === "saving" || progress === "revalidate" || progress === "warm";
  const busy = featureBusy || cacheBusy;
  const [ending, setEnding] = useState<string | null>(null);
  const newDraft = (): Draft => {
    const start = new Date();
    return { occasionId: "", title: "", subtitle: "", start: toLocalDateTime(start), end: toLocalDateTime(oneMonthAfter(start)) };
  };
  const load = useCallback(async () => {
    const data = await requestJson("/api/admin/features") as FeatureOverview;
    setOverview(data);
    setNow(Date.now());
    return data;
  }, []);
  useEffect(() => {
    let disposed = false;
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    void requestJson("/api/admin/features").then((data: FeatureOverview) => {
      if (disposed) return;
      const time = Date.now();
      setNow(time); setOverview(data);
      if (!data.features.some((feature) => featureStatus(feature, time) === "current")) setDraft(newDraft());
    }).catch((error: Error) => { if (!disposed) setError(error.message); });
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  const refreshHomepage = async () => {
    setWarning("");
    try {
      setProgress("revalidate");
      await requestJson("/api/admin/features/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "revalidate" }) });
      setProgress("warm");
      await requestJson("/api/admin/features/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "warm" }) });
      setProgress("done");
    } catch (error) {
      setWarning(`Your change is saved. ${error instanceof Error ? error.message : "The homepage could not be refreshed."}`);
      setProgress("warning");
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || busy) return;
    setError(""); setProgress("saving");
    try {
      const start = new Date(draft.start), end = new Date(draft.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= new Date()) throw new Error("End at must be in the future and after Start at.");
      // Reject nonexistent local wall-clock times during a daylight-saving jump.
      if (toLocalDateTime(start) !== draft.start || toLocalDateTime(end) !== draft.end) throw new Error("That time does not exist in your time zone. Choose another time.");
      await requestJson("/api/admin/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: draft.id, occasionId: draft.occasionId, title: draft.title, subtitle: draft.subtitle,
        startsAt: start.toISOString(), endsAt: end.toISOString(),
      }) });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save feature"); setProgress("idle"); return;
    }
    setDraft(null);
    try { await load(); } catch { setError("Feature saved, but the list could not be refreshed. Reload this page to see it."); }
    await refreshHomepage();
  };
  const edit = (feature: AdminFeature) => {
    setError(""); setProgress("idle");
    setDraft({ id: feature.id, occasionId: feature.entity_id, title: feature.title_override || feature.entity_name,
      subtitle: feature.subtitle || "", start: toLocalDateTime(new Date(feature.starts_at || Date.now())),
      end: toLocalDateTime(feature.ends_at ? new Date(feature.ends_at) : oneMonthAfter(new Date())) });
  };
  const endFeature = async (feature: AdminFeature) => {
    if (busy || !window.confirm(`End “${feature.title_override || feature.entity_name}”? It will stop being featured. You can feature it again later.`)) return;
    setEnding(feature.id); setProgress("saving"); setError("");
    try { await requestJson(`/api/admin/features/${feature.id}`, { method: "DELETE" }); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not end feature"); setProgress("idle"); setEnding(null); return; }
    try { await load(); } catch { setError("Feature ended, but the list could not be refreshed. Reload this page."); }
    setEnding(null); await refreshHomepage();
  };
  const format = (value: string | null, fallback: string) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : fallback;
  const live = overview?.features.filter((feature) => featureStatus(feature, now ?? 0) === "current") ?? [];
  const scheduled = overview?.features.filter((feature) => featureStatus(feature, now ?? 0) === "scheduled") ?? [];
  const current = live[0];
  const beginNew = () => { setDraft(newDraft()); setError(""); setProgress("idle"); };
  const leftHeader = <div className="mb-5 flex min-h-10 items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a47d6d]">Currently Featured</h2><button type="button" disabled={busy || !overview} className={primary} onClick={beginNew}>New</button></div>;
  const card = (feature: AdminFeature, current = false) => (
    <article key={feature.id} className={`${panel} ${current ? "border-[#cbd9b8] bg-[linear-gradient(125deg,#f4f7ed,#fffdf8)]" : ""}`}>
      {current ? leftHeader : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#819369]">{current ? "On the homepage" : "Upcoming"}</p>
          <h3 className="font-display text-2xl text-[#644b40]">{feature.title_override || feature.entity_name}</h3>
          {feature.subtitle ? <p className="mt-2 whitespace-pre-line text-sm text-[#957c6c]">{feature.subtitle}</p> : null}
          <p className="mt-4 text-sm text-[#6d8058]">{feature.entity_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#e4ecd8] px-3 py-1 text-xs font-medium text-[#657d4f]">{current ? "Live" : "Scheduled"}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e7e5d8] pt-4">
        <p className="text-xs leading-relaxed text-[#9b8373]">{format(feature.starts_at, "Already started")} → {format(feature.ends_at, "No end date")}<br />{timezone}</p>
        <div className="flex gap-2">
          {feature.entity_table === "tags" && overview?.occasions.some((tag) => tag.id === feature.entity_id) ? <button type="button" onClick={() => edit(feature)} disabled={busy} className={secondary}>Edit</button> : null}
          <button type="button" onClick={() => void endFeature(feature)} disabled={busy} className={secondary}>{ending === feature.id ? "Ending…" : current ? "End feature" : "Cancel feature"}</button>
        </div>
      </div>
      {feature.entity_table !== "tags" ? <p className="mt-3 text-sm text-[#a66d56]">This item is active, but the homepage currently supports Occasions only.</p> : null}
    </article>
  );

  return (
    <div className="mx-auto max-w-5xl px-1 pb-24 pt-2">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><h1 className="font-display text-3xl text-[#6c4a3f]">Feature</h1><p className="mt-2 text-sm text-[#a47d6d]">Give an Occasion a place on the homepage.</p></div>
      </div>
      <div role="status" aria-live="polite" className="mb-3 min-h-5 text-sm text-[#819369]">
        {progress === "saving" ? "Saving your feature…" : progress === "revalidate" ? "Saved · Refreshing the homepage…" : progress === "warm" ? "Saved · Preparing the homepage cache…" : progress === "done" ? "Saved · Homepage refreshed and ready." : ""}
      </div>
      {error ? <p role="alert" className="mb-4 rounded-xl border border-[#e9cfc4] bg-[#fff5ef] p-4 text-sm text-[#a45e5a]">{error}</p> : null}
      {warning ? <div role="alert" className="mb-4 rounded-xl border border-[#e8d6a8] bg-[#fff9e9] p-4 text-sm text-[#9b7d42]">{warning}<button type="button" className="ml-3 underline" disabled={busy} onClick={() => void refreshHomepage()}>Retry homepage refresh</button></div> : null}
      {!overview ? <p className="py-12 text-sm text-[#a47d6d]">{error ? "The features could not be loaded." : "Loading features…"}</p> : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            {current ? card(current, true) : <div className={panel}>{leftHeader}<div className="py-5 text-center"><p className="font-display text-xl text-[#826b59]">A little space for something special.</p><p className="mt-2 text-sm text-[#a18b7b]">Nothing is featured right now. Create a feature to get started.</p></div></div>}
            {live.length > 1 ? <p className="text-xs text-[#a18b7b]">{live.length - 1} other active feature(s) share this period. The homepage uses the first by priority.</p> : null}
            {scheduled.length ? <><h2 className="pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#a47d6d]">Scheduled</h2>{scheduled.map((feature) => card(feature))}</> : null}
          </section>
          {draft ? (
            <form onSubmit={save} className={`${panel} space-y-5`}>
              <div className="flex items-center justify-between"><h2 className="font-display text-2xl text-[#6c4a3f]">{draft.id ? "Edit feature" : "New feature"}</h2><button type="button" disabled={busy} onClick={() => setDraft(null)} className="text-sm text-[#a18b7b] hover:text-[#6c4a3f]">Cancel</button></div>
              <label className="block text-sm font-medium text-[#87675d]">What would you like to feature?
                <select required disabled={busy} value={draft.occasionId} className={`${field} mt-2`} onChange={(event) => {
                  const occasion = overview.occasions.find((tag) => tag.id === event.target.value);
                  setDraft({ ...draft, occasionId: event.target.value, title: occasion?.name || "", subtitle: occasion?.description || "" });
                }}><option value="">Choose an Occasion</option>{overview.occasions.map((tag) => <option key={tag.id} value={tag.id} disabled={!tag.published || !tag.slug}>{tag.name}{!tag.published ? " · Unpublished" : !tag.slug ? " · Missing public URL" : ""}</option>)}</select>
              </label>
              <label className="block text-sm font-medium text-[#87675d]">Title<input required maxLength={160} disabled={busy} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`${field} mt-2`} placeholder="The Occasion’s name" /></label>
              <label className="block text-sm font-medium text-[#87675d]">Subtitle<textarea maxLength={1000} disabled={busy} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} rows={3} className={`${field} mt-2 resize-y`} placeholder="A short invitation to explore" /></label>
              <div><p className="mb-3 text-xs text-[#a18b7b]">All dates and times are in {timezone}.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <DateTimePicker label="Start at" value={draft.start} disabled={busy} onChange={(start) => setDraft({ ...draft, start })} />
                <DateTimePicker label="Ends at" value={draft.end} disabled={busy} onChange={(end) => setDraft({ ...draft, end })} />
              </div></div>
              {draft.occasionId ? <div className="rounded-xl border border-dashed border-[#d9dfc9] bg-[#f6f8f0] p-4"><p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#92a07d]">Homepage preview</p><p className="font-display text-xl text-[#6d8058]">{draft.title}</p><p className="mt-1 whitespace-pre-line text-sm text-[#a18b7b]">{draft.subtitle}</p></div> : null}
              <button type="submit" disabled={busy || !draft.occasionId} className={`${primary} w-full`}>{progress === "saving" ? "Saving…" : draft.id ? "Save changes" : new Date(draft.start).getTime() > (now || 0) ? "Schedule feature" : "Feature this Occasion"}</button>
            </form>
          ) : <div className={panel}><h2 className="mb-3 flex min-h-10 items-center font-display text-2xl text-[#6c4a3f]">New feature</h2><p className="text-sm leading-relaxed text-[#a18b7b]">Plan the next Occasion, or edit your current feature. Choose New on the left to get started.</p></div>}
        </div>
      )}
      <CacheRefreshPanel disabled={featureBusy} onBusyChange={setCacheBusy} />
    </div>
  );
}
