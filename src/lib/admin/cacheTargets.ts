export const CACHE_TARGETS = [
  { id: "home", label: "Homepage", description: "Features, new uploads and homepage collections", group: "main" },
  { id: "rare-gems", label: "Rare gems", description: "Featured and recommended selections", group: "main" },
  { id: "explore", label: "Explore", description: "All browsing collections and directories", group: "main" },
  { id: "kirtan-page", label: "Kirtan pages", description: "Recording details and related recommendations", group: "main" },
  { id: "explore-bhajans", label: "Bhajans", description: "Bhajan library and alphabet index", group: "explore" },
  { id: "explore-maha-mantras", label: "Maha Mantras", description: "Mantra library and collections", group: "explore" },
  { id: "explore-leads", label: "Lead singers", description: "Singer directory and counts", group: "explore" },
  { id: "explore-leads-slugs", label: "Singer pages", description: "Individual singer collections", group: "explore" },
  { id: "explore-occasions", label: "Occasions", description: "Occasion directory and counts", group: "explore" },
  { id: "explore-occasion-slugs", label: "Occasion pages", description: "Individual Occasion collections", group: "explore" },
] as const;
export type CacheTarget = "all" | typeof CACHE_TARGETS[number]["id"];
export function isCacheTarget(value: unknown): value is CacheTarget {
  return value === "all" || CACHE_TARGETS.some((target) => target.id === value);
}

export const CACHE_TAGS = ["home", "rare-gems", "kirtan-page", "explore-bhajans", "explore-maha-mantras", "explore-leads", "explore-leads-slugs", "explore-occasions", "explore-occasion-slugs"] as const;
export function tagsForTarget(target: CacheTarget): readonly string[] {
  if (target === "all") return CACHE_TAGS;
  if (target === "home") return ["home", "kirtan-page"];
  if (target === "rare-gems") return ["rare-gems", "kirtan-page"];
  if (target === "explore") return CACHE_TAGS.filter((tag) => tag.startsWith("explore-") || tag === "kirtan-page");
  return [target];
}
