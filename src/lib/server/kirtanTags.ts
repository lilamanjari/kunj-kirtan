import { supabase } from "@/lib/supabase";

export type KirtanFeatureTagContext = {
  occasionTags: string[];
  personTag: string | null;
};

export async function fetchKirtanTagContext(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return {
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const { data, error } = await supabase
    .from("kirtan_tags")
    .select("kirtan_id, tags!inner(slug, name, category)")
    .in("kirtan_id", uniqueIds)
    .eq("tags.published", true);

  if (error) {
    return {
      error: error.message,
      harmoniumIds: new Set<string>(),
      rareGemIds: new Set<string>(),
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const harmoniumIds = new Set<string>();
  const rareGemIds = new Set<string>();
  const occasionTagsById = new Map<string, Set<string>>();
  const personTagsById = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    const joinedTag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
    if (!joinedTag?.slug) continue;

    if (joinedTag.slug === "harmonium") {
      harmoniumIds.add(row.kirtan_id);
      continue;
    }
    if (joinedTag.slug === "rare-gem") {
      rareGemIds.add(row.kirtan_id);
      continue;
    }
    if (!joinedTag.name) continue;

    if (joinedTag.category === "occasion") {
      const names = occasionTagsById.get(row.kirtan_id) ?? new Set<string>();
      names.add(joinedTag.name);
      occasionTagsById.set(row.kirtan_id, names);
    }
    if (joinedTag.category === "person") {
      const names = personTagsById.get(row.kirtan_id) ?? new Set<string>();
      names.add(joinedTag.name);
      personTagsById.set(row.kirtan_id, names);
    }
  }

  const tagContextById = new Map<string, KirtanFeatureTagContext>();
  const contextIds = new Set([
    ...occasionTagsById.keys(),
    ...personTagsById.keys(),
  ]);
  for (const id of contextIds) {
    const occasionTags = Array.from(occasionTagsById.get(id) ?? []).sort(
      (left, right) => left.localeCompare(right),
    );
    const personTag = Array.from(personTagsById.get(id) ?? []).sort(
      (left, right) => left.localeCompare(right),
    )[0] ?? null;
    tagContextById.set(id, { occasionTags, personTag });
  }

  return { harmoniumIds, rareGemIds, tagContextById };
}

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

  return { harmoniumIds, rareGemIds };
}
