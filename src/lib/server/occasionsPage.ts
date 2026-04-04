import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

type Occasion = {
  id: string;
  name: string;
  slug: string;
};

const getCachedOccasionsPageData = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("category", "occasion")
      .order("name", { ascending: true });

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    return {
      data: { occasions: (data ?? []) as Occasion[] },
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
