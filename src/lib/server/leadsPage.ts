import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { LeadItem } from "@/types/explore";

const getCachedLeadsPageData = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from("lead_singers")
      .select("id, display_name, slug")
      .eq("is_identified", true)
      .order("display_name", { ascending: true });

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const leads: LeadItem[] =
      data?.map((lead) => ({
        id: lead.id,
        display_name: lead.display_name,
        slug: lead.slug,
      })) ?? [];

    return {
      data: { leads },
      error: null,
      status: 200,
    };
  },
  ["leads-page-data"],
  {
    revalidate: 86400,
    tags: ["explore-leads"],
  },
);

export async function getLeadsPageData() {
  return getCachedLeadsPageData();
}
