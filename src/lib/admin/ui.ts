export function adminSectionCardClassName(extra = "") {
  return `rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-[rgba(255,250,246,0.92)] shadow-[0_20px_44px_rgba(170,118,91,0.12)] ${extra}`.trim();
}

export function adminFieldClassName() {
  return "w-full rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-white/90 px-3 py-2 text-sm text-[#5d433c] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)]";
}

export function adminDetailFieldLabelClassName() {
  return "text-sm font-medium text-[#a47d6d]";
}

export function adminPanelHeadingClassName() {
  return "font-display text-[1.8rem] leading-none text-[#5d433c]";
}

export function adminPanelDescriptionClassName() {
  return "mt-1 font-display text-[0.95rem] leading-tight text-[#8c6a63]";
}

export function adminPrimaryButtonClassName() {
  return "shrink-0 whitespace-nowrap rounded-[var(--theme-radius-surface)] border border-[rgba(99,127,77,0.72)] bg-[linear-gradient(180deg,rgba(115,145,85,0.96)_0%,rgba(93,120,80,0.96)_100%)] px-4 py-2 text-sm font-medium text-[#fffdf7] shadow-[0_12px_26px_rgba(93,120,80,0.24)] transition hover:brightness-[1.02] disabled:pointer-events-none disabled:opacity-50";
}

export function adminSecondaryButtonClassName() {
  return "shrink-0 whitespace-nowrap rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-[rgba(255,253,250,0.96)] px-4 py-2 text-sm font-medium text-[#75584d] shadow-[0_10px_22px_rgba(146,107,79,0.08)] transition hover:bg-[#fff8f2] disabled:pointer-events-none disabled:opacity-50";
}

export function adminDangerButtonClassName() {
  return "shrink-0 whitespace-nowrap rounded-[var(--theme-radius-surface)] border border-[#d8aba4] bg-[#fff2ef] px-4 py-2 text-sm font-medium text-[#b06b65] shadow-[0_10px_22px_rgba(176,107,101,0.08)] transition hover:bg-[#ffe9e4] disabled:pointer-events-none disabled:opacity-50";
}

export function adminStatusBadgeClassName(active: boolean) {
  return active
    ? "rounded-[0.45rem] bg-[color:var(--theme-player-green-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--theme-player-green)]"
    : "rounded-[0.45rem] bg-[#f5e5de] px-2.5 py-1 text-xs font-semibold text-[#af6f6a]";
}
