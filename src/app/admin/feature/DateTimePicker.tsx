"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toLocalDateTime } from "@/lib/admin/features";

const button = "rounded-xl px-3 py-2 text-sm transition hover:bg-[#edf2e6] focus-visible:outline-2 focus-visible:outline-[#789759]";

export default function DateTimePicker({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(value || Date.now()));
  const root = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const selected = new Date(value);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !popover.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    requestAnimationFrame(() => popover.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus());
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", close); };
  }, [open]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
  const chooseDay = (day: Date) => {
    const next = new Date(selected);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(toLocalDateTime(next));
  };
  const shift = (direction: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));

  return (
    <div ref={root} className="relative min-w-0">
      <span className="mb-2 block text-sm font-medium text-[#87675d]">{label}</span>
      <button ref={trigger} type="button" disabled={disabled} aria-label={label} aria-expanded={open} aria-controls={dialogId}
        onClick={() => {
          if (!open) {
            setMonth(new Date(value));
            const rect = trigger.current!.getBoundingClientRect();
            setPosition({ top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 490)), left: Math.max(16, Math.min(rect.left, window.innerWidth - Math.min(320, window.innerWidth - 32) - 16)) });
          }
          setOpen(!open);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e5d5c7] bg-white px-4 py-3 text-left text-sm text-[#654d43] shadow-sm transition hover:border-[#8fa777] focus-visible:outline-2 focus-visible:outline-[#789759] disabled:opacity-50">
        <span>{selected.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4m8-4v4" /></svg>
      </button>
      {open && !disabled ? createPortal(
        <div ref={popover} id={dialogId} role="dialog" aria-label={`${label} date and time`} style={{ ...position, maxHeight: `calc(100dvh - ${position.top + 12}px)` }} className="fixed z-50 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#e4d7c9] bg-[#fffdf8] p-4 shadow-[0_20px_60px_rgba(90,67,48,0.18)]">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className={button} aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <span aria-live="polite" className="text-sm font-semibold text-[#5f744d]">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button type="button" className={button} aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: 7 }, (_, index) => new Date(2026, 0, 5 + index).toLocaleDateString(undefined, { weekday: "narrow" })).map((day, index) => <span key={index} className="py-1 text-xs text-[#a18b7b]">{day}</span>)}
            {days.map((day) => {
              const active = day.toDateString() === selected.toDateString();
              return <button key={day.toISOString()} type="button" aria-label={day.toLocaleDateString(undefined, { dateStyle: "full" })} aria-pressed={active}
                data-day={toLocalDateTime(day).slice(0, 10)} tabIndex={active ? 0 : -1}
                onKeyDown={(event) => {
                  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
                  if (step === undefined) return;
                  event.preventDefault();
                  const next = new Date(day); next.setDate(next.getDate() + step);
                  chooseDay(next); setMonth(next);
                  requestAnimationFrame(() => popover.current?.querySelector<HTMLButtonElement>(`[data-day="${toLocalDateTime(next).slice(0, 10)}"]`)?.focus());
                }}
                onClick={() => chooseDay(day)} className={`aspect-square rounded-full text-sm transition focus-visible:outline-2 focus-visible:outline-[#789759] ${active ? "bg-[#718c55] text-white shadow-sm" : day.getMonth() === month.getMonth() ? "text-[#674f44] hover:bg-[#eaf0e2]" : "text-[#c0b3a8] hover:bg-[#f3eee5]"}`}>{day.getDate()}</button>;
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#eee5da] pt-3">
            <label className="text-sm text-[#87675d]">Time <input aria-label={`${label} time`} type="time" value={value.slice(11, 16)} onChange={(event) => { if (event.target.value) onChange(`${value.slice(0, 10)}T${event.target.value}`); }} className="ml-2 rounded-lg border border-[#e5d5c7] bg-white px-2 py-1.5 text-sm text-[#654d43]" /></label>
            <button type="button" className={button} onClick={() => { const now = new Date(); onChange(toLocalDateTime(now)); setMonth(now); }}>Now</button>
          </div>
          <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="mt-3 w-full rounded-xl bg-[#e9efdf] py-2 text-sm font-medium text-[#607b48] transition hover:bg-[#dce7ce]">Done</button>
        </div>, document.body,
      ) : null}
    </div>
  );
}
