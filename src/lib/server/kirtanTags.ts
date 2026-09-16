import { supabase } from "@/lib/supabase";

export type KirtanFeatureTagContext = {
  occasionTags: string[];
  personTag: string | null;
};

export async function fetchKirtanFeatureTagContext(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return {
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("slug, name, category")
    .in("category", ["occasion", "person"])
    .eq("published", true);

  if (tagsError) {
    return {
      error: tagsError.message,
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const tagsBySlug = new Map(
    (tags ?? [])
      .filter((tag) => tag.slug && tag.name)
      .map((tag) => [
        tag.slug!,
        { name: tag.name, category: tag.category },
      ]),
  );
  const tagSlugs = Array.from(tagsBySlug.keys());
  if (!tagSlugs.length) {
    return {
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const { data: links, error: linksError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id, slug")
    .in("kirtan_id", uniqueIds)
    .in("slug", tagSlugs);

  if (linksError) {
    return {
      error: linksError.message,
      tagContextById: new Map<string, KirtanFeatureTagContext>(),
    };
  }

  const tagContextById = new Map<string, KirtanFeatureTagContext>();
  for (const link of links ?? []) {
    const tag = tagsBySlug.get(link.slug);
    if (!tag) continue;

    const context = tagContextById.get(link.kirtan_id) ?? {
      occasionTags: [],
      personTag: null,
    };

    if (tag.category === "occasion") {
      context.occasionTags.push(tag.name);
    } else if (tag.category === "person" && !context.personTag) {
      context.personTag = tag.name;
    }

    tagContextById.set(link.kirtan_id, context);
  }

  for (const context of tagContextById.values()) {
    context.occasionTags.sort((left, right) => left.localeCompare(right));
  }

  return { tagContextById };
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
