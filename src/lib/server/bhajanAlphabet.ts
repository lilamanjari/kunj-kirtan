import { supabase } from "@/lib/supabase";
import { ALPHABET } from "@/lib/alphabets";
import type { BhajanAlphabetIndex, BhajanCursor } from "@/types/bhajans";

function normalizeSearchText(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function buildBhajanAlphabetIndex(search: string | null) {
  const normalizedSearch = search ? normalizeSearchText(search) : null;

  const entries = await Promise.all(
    ALPHABET.map(async (letter) => {
      let query = supabase
        .from("playable_bhajan_titles")
        .select("browse_id,title")
        .ilike("title", `${letter}%`)
        .order("title", { ascending: true })
        .order("browse_id", { ascending: true })
        .limit(1);

      if (normalizedSearch) {
        query = query.ilike("searchable_text", `%${normalizedSearch}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      const first = data?.[0];
      return first
        ? ([letter, { title: first.title, id: first.browse_id }] as const)
        : null;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, BhajanCursor] => Boolean(entry)),
  ) satisfies BhajanAlphabetIndex;
}
