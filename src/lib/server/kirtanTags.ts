import { supabase } from "@/lib/supabase";

export async function fetchKirtanTagFlags(ids: string[]) {
  if (!ids.length) {
    return {
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
    };
  }

  const { data, error } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id, slug")
    .in("slug", ["harmonium", "rare-gem"])
    .in("kirtan_id", ids);

  if (error) {
    return {
      error: error.message,
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
    };
  }

  const harmoniumIds = new Set<string>();
  const rareGemIds = new Set<string>();

  for (const row of data ?? []) {
    if (row.slug === "harmonium") {
      harmoniumIds.add(row.kirtan_id);
    }
    if (row.slug === "rare-gem") {
      rareGemIds.add(row.kirtan_id);
    }
  }

  return {
    harmoniumIds,
    rareGemIds,
  };
}
