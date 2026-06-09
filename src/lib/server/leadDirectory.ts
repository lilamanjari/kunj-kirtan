import { supabase } from "@/lib/supabase";
import type { LeadItem } from "@/types/explore";
import type { KirtanType } from "@/types/kirtan";
import type { LeadCounts } from "@/types/leads";
import { compareLeadDirectoryItems } from "@/lib/server/occasionCurations";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import { buildBucketImageUrl, buildTransformedImageUrl } from "@/lib/media";
import {
  OTHER_LEAD_THRESHOLD,
  OTHER_LEAD_ID,
  OTHER_LEAD_SLUG,
  OTHER_LEAD_LABEL,
} from "@/lib/leadConstants";

type LeadTypeCountRow = {
  lead_singer_id: string | null;
  type: KirtanType;
  count: number | string | null;
};

function emptyLeadCounts(): LeadCounts {
  return { MM: 0, BHJ: 0, HK: 0 };
}

type LeadAggregate = {
  id: string;
  display_name: string;
  slug: string;
  priority: number | null;
  counts: LeadCounts;
  total: number;
};

export async function fetchLeadDirectory() {
  const { data: leads, error: leadsError } = await supabase
    .from("lead_singers")
    .select("id, display_name, slug, priority")
    .eq("is_identified", true)
    .order("priority", { ascending: true })
    .order("display_name", { ascending: true });

  if (leadsError) {
    return {
      leads: [] as LeadItem[],
      otherLeadIds: [] as string[],
      otherCounts: emptyLeadCounts(),
      error: leadsError.message,
    };
  }

  const { data: kirtans, error: kirtansError } = await supabase
    .from("lead_kirtan_counts")
    .select("lead_singer_id, type, count");

  if (kirtansError) {
    return {
      leads: [] as LeadItem[],
      otherLeadIds: [] as string[],
      otherCounts: emptyLeadCounts(),
      error: kirtansError.message,
    };
  }

  const leadIds = (leads ?? []).map((lead) => lead.id);
  const { imagesByLeadSingerId, error: imagesError } =
    await fetchPrimaryLeadSingerImages(leadIds);

  if (imagesError) {
    return {
      leads: [] as LeadItem[],
      otherLeadIds: [] as string[],
      otherCounts: emptyLeadCounts(),
      error: imagesError,
    };
  }

  const countsByLead = new Map<string, LeadCounts>();
  for (const row of (kirtans ?? []) as LeadTypeCountRow[]) {
    if (!row.lead_singer_id) continue;
    const counts = countsByLead.get(row.lead_singer_id) ?? emptyLeadCounts();
    counts[row.type] += Number(row.count ?? 0);
    countsByLead.set(row.lead_singer_id, counts);
  }

  const aggregates: LeadAggregate[] = (leads ?? [])
    .map((lead) => {
      const counts = countsByLead.get(lead.id) ?? emptyLeadCounts();
      const total = counts.MM + counts.BHJ + counts.HK;
      return {
        id: lead.id,
        display_name: lead.display_name,
        slug: lead.slug,
        priority: lead.priority ?? 100,
        counts,
        total,
      };
    })
    .filter((lead) => lead.total > 0);

  const regularLeads = aggregates
    .filter((lead) => lead.total > OTHER_LEAD_THRESHOLD)
    .sort(compareLeadDirectoryItems)
    .map<LeadItem>((lead) => ({
      id: lead.id,
      display_name: lead.display_name,
      slug: lead.slug,
      count: lead.total,
      image_url: imagesByLeadSingerId.get(lead.id)?.url ?? null,
      image_alt:
        imagesByLeadSingerId.get(lead.id)?.alt_text ?? lead.display_name,
    }));

  const others = aggregates.filter(
    (lead) => lead.total <= OTHER_LEAD_THRESHOLD,
  );
  const otherLeadIds = others.map((lead) => lead.id);
  const otherCounts = others.reduce<LeadCounts>((acc, lead) => {
    acc.MM += lead.counts.MM;
    acc.BHJ += lead.counts.BHJ;
    acc.HK += lead.counts.HK;
    return acc;
  }, emptyLeadCounts());
  const otherTotal = otherCounts.MM + otherCounts.BHJ + otherCounts.HK;
  const otherLeadImageUrl = buildTransformedImageUrl(
    buildBucketImageUrl("page-art/other-lead-singers.png"),
    {
      width: 160,
      height: 160,
      fit: "cover",
      format: "png",
      quality: 82,
    },
  );

  const list = [...regularLeads];
  if (otherTotal > 0) {
    list.push({
      id: OTHER_LEAD_ID,
      display_name: OTHER_LEAD_LABEL,
      slug: OTHER_LEAD_SLUG,
      count: otherTotal,
      image_url: otherLeadImageUrl ? `${otherLeadImageUrl}&v=1` : null,
      image_alt: OTHER_LEAD_LABEL,
    });
  }

  return {
    leads: list,
    otherLeadIds,
    otherCounts,
    error: null,
  };
}
