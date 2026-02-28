import { supabase } from "@/lib/supabase";
import type { KirtanType } from "@/types/kirtan";

type FeaturedResult<T> = {
  kirtan: T | null;
  error: string | null;
};

function dailyIndex(length: number, salt = "") {
  const today = new Date().toISOString().slice(0, 10);
  const seedInput = `${today}-${salt}`;
  let seed = 0;
  for (let i = 0; i < seedInput.length; i += 1) {
    seed = (seed * 31 + seedInput.charCodeAt(i)) % 2147483647;
  }
  return length > 0 ? seed % length : 0;
}

export async function getDailyRareGem(type?: KirtanType): Promise<FeaturedResult<any>> {
  const { data: rareGemKirtans, error: tagError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", "rare-gem");

  if (tagError) {
    return { kirtan: null, error: tagError.message };
  }

  const rareGemIds = rareGemKirtans?.map((r) => r.kirtan_id) ?? [];
  if (rareGemIds.length === 0) {
    return { kirtan: null, error: null };
  }

  let query = supabase
    .from("playable_kirtans")
    .select("*")
    .in("id", rareGemIds)
    .order("id", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) {
    return { kirtan: null, error: error.message };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return { kirtan: null, error: null };
  }

  const index = dailyIndex(rows.length, type ?? "ALL");
  return { kirtan: rows[index], error: null };
}
