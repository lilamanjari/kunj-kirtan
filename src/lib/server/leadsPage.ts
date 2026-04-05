import { unstable_cache } from "next/cache";
import type { LeadItem } from "@/types/explore";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";

const getCachedLeadsPageData = unstable_cache(
  async () => {
    const { leads, error } = await fetchLeadDirectory();

    if (error) {
      return { data: null, error, status: 500 };
    }

    return {
      data: { leads: leads as LeadItem[] },
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
