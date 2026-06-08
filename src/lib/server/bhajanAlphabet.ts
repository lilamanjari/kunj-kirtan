import { supabase } from "@/lib/supabase";
import { ALPHABET } from "@/lib/alphabets";
import type { BhajanAlphabetIndex, BhajanCursor } from "@/types/bhajans";
import {
  fetchBhajanCollectionKirtanIds,
  type BhajanCollectionKey,
} from "@/lib/server/bhajanCollections";

function normalizeSearchText(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function buildBhajanAlphabetIndex(
  search: string | null,
  collection: BhajanCollectionKey = "ALL",
) {
  const normalizedSearch = search ? normalizeSearchText(search) : null;
  const { ids: collectionIds, error: collectionError } =
    await fetchBhajanCollectionKirtanIds(collection);

  if (collectionError) {
    throw new Error(collectionError);
  }

  if (collection !== "ALL" && (!collectionIds || collectionIds.length === 0)) {
    return {} satisfies BhajanAlphabetIndex;
  }

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
      if (collection !== "ALL" && collectionIds) {
        query = query.in("kirtan_id", collectionIds);
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
