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

export async function fetchKirtanPersonNames(ids: string[]) {
  if (!ids.length) {
    return {
      personNamesById: new Map<string, string>(),
    };
  }

  const { data: personTags, error: tagsError } = await supabase
    .from("tags")
    .select("slug, name")
    .eq("category", "person");

  if (tagsError) {
    return {
      error: tagsError.message,
      personNamesById: new Map<string, string>(),
    };
  }

  const slugs = (personTags ?? []).map((tag) => tag.slug);
  if (!slugs.length) {
    return {
      personNamesById: new Map<string, string>(),
    };
  }

  const { data: links, error: linksError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id, slug")
    .in("kirtan_id", ids)
    .in("slug", slugs);

  if (linksError) {
    return {
      error: linksError.message,
      personNamesById: new Map<string, string>(),
    };
  }

  const tagNamesBySlug = new Map<string, string>(
    (personTags ?? []).map((tag) => [tag.slug, tag.name]),
  );
  const personNamesById = new Map<string, string>();

  for (const row of links ?? []) {
    if (personNamesById.has(row.kirtan_id)) continue;
    const name = tagNamesBySlug.get(row.slug);
    if (name) {
      personNamesById.set(row.kirtan_id, name);
    }
  }

  return {
    personNamesById,
  };
}
