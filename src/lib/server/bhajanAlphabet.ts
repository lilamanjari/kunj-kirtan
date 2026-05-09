import { supabase } from "@/lib/supabase";
import { ALPHABET } from "@/lib/alphabets";
import type { BhajanAlphabetIndex, BhajanCursor } from "@/types/bhajans";

export async function buildBhajanAlphabetIndex(search: string | null) {
  const entries = await Promise.all(
    ALPHABET.map(async (letter) => {
      let query = supabase
        .from("playable_kirtans")
        .select("id,title")
        .eq("type", "BHJ")
        .ilike("title", `${letter}%`)
        .order("title", { ascending: true })
        .order("id", { ascending: true })
        .limit(1);

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      const first = data?.[0];
      return first
        ? ([letter, { title: first.title, id: first.id }] as const)
        : null;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, BhajanCursor] => Boolean(entry)),
  ) satisfies BhajanAlphabetIndex;
}
