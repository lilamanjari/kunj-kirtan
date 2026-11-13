import type { KirtanSummary } from "@/types/kirtan";

type LeadListItem = {
  display_name: string;
  slug: string;
  priority?: number | null;
};

export function compareOccasionKirtans(
  left: KirtanSummary,
  right: KirtanSummary,
  leadSingerPriorities?: ReadonlyMap<string, number>,
) {
  if (left.type !== right.type) {
    if (left.type === "BHJ") return -1;
    if (right.type === "BHJ") return 1;
    if (left.type === "MM") return -1;
    if (right.type === "MM") return 1;
  }

  const titleDiff = left.title.localeCompare(right.title, undefined, {
    sensitivity: "base",
  });
  if (titleDiff !== 0) {
    return titleDiff;
  }

  const leftPriority = left.lead_singer_id
    ? leadSingerPriorities?.get(left.lead_singer_id) ?? 100
    : 100;
  const rightPriority = right.lead_singer_id
    ? leadSingerPriorities?.get(right.lead_singer_id) ?? 100
    : 100;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const singerDiff = (left.lead_singer ?? "").localeCompare(
    right.lead_singer ?? "",
    undefined,
    { sensitivity: "base" },
  );
  if (singerDiff !== 0) {
    return singerDiff;
  }

  return left.id.localeCompare(right.id);
}

export function compareLeadDirectoryItems(
  left: LeadListItem,
  right: LeadListItem,
) {
  const leftPriority = left.priority ?? 100;
  const rightPriority = right.priority ?? 100;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.display_name.localeCompare(right.display_name, undefined, {
    sensitivity: "base",
  });
}
