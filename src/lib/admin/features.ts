export type OccasionOption = { id: string; name: string; description: string | null; published: boolean; slug: string | null };
export type AdminFeature = {
  id: string; entity_table: string; entity_id: string; title_override: string | null;
  subtitle: string | null; starts_at: string | null; ends_at: string | null;
  is_active: boolean; sort_order: number; created_at: string; entity_name: string;
};
export type FeatureOverview = { features: AdminFeature[]; occasions: OccasionOption[] };

export function featureStatus(feature: AdminFeature, now = Date.now()) {
  if (!feature.is_active) return "ended";
  if (feature.ends_at && new Date(feature.ends_at).getTime() <= now) return "ended";
  if (feature.starts_at && new Date(feature.starts_at).getTime() > now) return "scheduled";
  return "current";
}

export function toLocalDateTime(date: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function oneMonthAfter(date: Date) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}
