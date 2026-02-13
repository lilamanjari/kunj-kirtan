export function parseDateSafe(dateStr: string) {
  if (!dateStr) return null;

  // iOS Safari is picky about bare YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateShort(dateStr: string) {
  const d = parseDateSafe(dateStr);
  if (!d) return "Unknown date";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(dateStr: string) {
  const d = parseDateSafe(dateStr);
  if (!d) return "Unknown date";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
