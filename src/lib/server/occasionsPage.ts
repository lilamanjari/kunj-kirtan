import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

type Occasion = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

const getCachedOccasionsPageData = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("category", "occasion")
      .eq("published", true)
      .eq("browse_visible", true)
      .order("name", { ascending: true });

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const occasionTags = (data ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    const slugs = occasionTags.map((occasion) => occasion.slug);
    const { data: tagLinks, error: tagLinksError } = slugs.length
      ? await supabase
          .from("kirtan_tag_slugs")
          .select("slug")
          .in("slug", slugs)
      : { data: [], error: null };

    if (tagLinksError) {
      return { data: null, error: tagLinksError.message, status: 500 };
    }

    const countsBySlug = new Map<string, number>();
    for (const row of tagLinks ?? []) {
      countsBySlug.set(row.slug, (countsBySlug.get(row.slug) ?? 0) + 1);
    }

    return {
      data: {
        occasions: occasionTags.map((occasion) => ({
          ...occasion,
          count: countsBySlug.get(occasion.slug) ?? 0,
        })) as Occasion[],
      },
      error: null,
      status: 200,
    };
  },
  ["occasions-page-data"],
  {
    revalidate: 86400,
    tags: ["explore-occasions"],
  },
);

export async function getOccasionsPageData() {
  return getCachedOccasionsPageData();
}
