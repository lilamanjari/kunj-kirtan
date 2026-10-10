import type { KirtanSummary, KirtanType } from "@/types/kirtan";

export function selectFavorites(favorites: KirtanSummary[], type: KirtanType) {
  return favorites.filter(item => item.type === type).sort((a, b) => {
    if (type === "BHJ") {
      return a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true });
    }
    return (b.recorded_date ?? "").localeCompare(a.recorded_date ?? "") ||
      a.title.localeCompare(b.title);
  });
}
