import { supabase } from "@/lib/supabase";

export async function fetchHarmoniumIds(ids: string[]) {
  if (!ids.length) {
    return { harmoniumIds: new Set<string>() };
  }

  const { data, error } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", "harmonium")
    .in("kirtan_id", ids);

  if (error) {
    return { error: error.message, harmoniumIds: new Set<string>() };
  }

  return {
    harmoniumIds: new Set((data ?? []).map((row) => row.kirtan_id)),
  };
}
