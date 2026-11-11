"use client";

import { useState } from "react";
import { CACHE_TARGETS, type CacheTarget } from "@/lib/admin/cacheTargets";

type Status = { phase: "revalidate" | "warm" | "done" | "error"; completed?: number; total?: number; message?: string; at?: string };

export default function CacheRefreshPanel({ disabled = false, onBusyChange }: { disabled?: boolean; onBusyChange: (busy: boolean) => void }) {
  const [active, setActive] = useState<CacheTarget | null>(null);
  const [statuses, setStatuses] = useState<Partial<Record<CacheTarget, Status>>>({});
  const [expanded, setExpanded] = useState(false);
  const run = async (target: CacheTarget) => {
    if (active || disabled) return;
    setActive(target); onBusyChange(true);
    setStatuses((current) => ({ ...current, [target]: { phase: "revalidate" } }));
    const call = async (stage: string, offset = 0) => {
      const response = await fetch("/api/admin/cache-refresh", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, stage, offset }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not refresh this content. Please try again.");
      return json as { nextOffset: number | null; completed: number; total: number };
    };
    try {
      await call("revalidate");
      setStatuses((current) => ({ ...current, [target]: { phase: "warm", completed: 0 } }));
      let offset: number | null = 0;
      let total = 0;
      while (offset !== null) {
        const result = await call("warm", offset);
        total = result.total;
        setStatuses((current) => ({ ...current, [target]: { phase: "warm", completed: result.completed, total } }));
        offset = result.nextOffset;
      }
      setStatuses((current) => ({ ...current, [target]: { phase: "done", total, at: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) } }));
    } catch (error) {
      setStatuses((current) => ({ ...current, [target]: { phase: "error", message: error instanceof Error ? error.message : "Cache refresh failed" } }));
    } finally { setActive(null); onBusyChange(false); }
  };
  const label = (status?: Status) => !status ? "" : status.phase === "revalidate" ? "Revalidating…" : status.phase === "warm" ? status.total ? `Warming ${status.completed} of ${status.total} pages…` : "Warming pages…" : status.phase === "done" ? `Ready · ${status.total} pages · ${status.at}` : "Could not finish · Try again";
  const icon = (spinning: boolean) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 ${spinning ? "animate-spin motion-reduce:animate-none" : ""}`}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17" /></svg>;
  const tile = (target: typeof CACHE_TARGETS[number]) => {
    const status = statuses[target.id];
    return <div key={target.id} className="rounded-xl border border-[#e8e0d4] bg-white/75 p-4 transition hover:border-[#d2ddc2]">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-[#6c594b]">{target.label}</h3><p className="mt-1 text-xs leading-relaxed text-[#a18b7b]">{target.description}</p></div>
        <button type="button" aria-label={`Refresh ${target.label}`} disabled={disabled || active !== null} onClick={() => void run(target.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9e1ce] bg-[#f1f5e9] text-[#71865b] transition hover:bg-[#e5edd9] active:scale-95 disabled:cursor-wait disabled:opacity-50">{icon(active === target.id)}</button>
      </div>
      {status ? <p role="status" className={`mt-3 text-xs ${status.phase === "error" ? "text-[#a45e5a]" : "text-[#819369]"}`}>{label(status)}</p> : null}
      {status?.phase === "error" ? <p className="mt-1 break-words text-xs text-[#a18b7b]">{status.message}</p> : null}
    </div>;
  };
  const all = statuses.all;
  return <section aria-label="Public cache refresh" className="mt-8 rounded-[var(--theme-radius-surface)] border border-[#dce3d0] bg-[linear-gradient(120deg,rgba(244,247,237,0.96),rgba(255,253,249,0.96))] p-6 shadow-[0_12px_32px_rgba(110,125,80,0.04)]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f9b7d]">Keep the public site fresh</p><h2 className="mt-1 font-display text-2xl text-[#667b51]">Refresh caches</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#a18b7b]">Revalidate content and warm its key public pages, here and on your configured public site.</p></div>
      <button type="button" onClick={() => void run("all")} disabled={disabled || active !== null}
        className="inline-flex items-center gap-2 rounded-xl bg-[#718c55] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#607b48] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60">{icon(active === "all")}Refresh all</button>
    </div>
    {all ? <div className="mt-4 rounded-xl border border-[#dce3d0] bg-white/70 px-4 py-3"><p role="status" className={`text-sm ${all.phase === "error" ? "text-[#a45e5a]" : "text-[#71865b]"}`}>{label(all)}</p>{all.phase === "error" ? <p className="mt-1 break-words text-xs text-[#a18b7b]">{all.message}</p> : null}</div> : null}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{CACHE_TARGETS.filter((target) => target.group === "main").map(tile)}</div>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-4 inline-flex items-center gap-2 py-1 text-xs font-medium text-[#819369] hover:text-[#607b48]">Individual explore targets <span aria-hidden="true" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span></button>
    {expanded ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{CACHE_TARGETS.filter((target) => target.group === "explore").map(tile)}</div> : null}
    <p className="mt-4 text-[11px] leading-relaxed text-[#a8a18d]">Both language versions are warmed. Recording pages start with the 10 latest uploads; other pages rebuild when visited.</p>
  </section>;
}
