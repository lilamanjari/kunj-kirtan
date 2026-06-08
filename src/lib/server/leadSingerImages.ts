import { buildBucketImageUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";

type LeadSingerImageRow = {
  lead_singer_id: string;
  image_key: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type LeadSingerImage = {
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
};

export async function fetchPrimaryLeadSingerImages(leadSingerIds: string[]) {
  const uniqueLeadSingerIds = Array.from(
    new Set(leadSingerIds.filter(Boolean)),
  );

  if (uniqueLeadSingerIds.length === 0) {
    return {
      imagesByLeadSingerId: new Map<string, LeadSingerImage>(),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("lead_singer_images")
    .select("lead_singer_id, image_key, alt_text, width, height, created_at")
    .in("lead_singer_id", uniqueLeadSingerIds)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      imagesByLeadSingerId: new Map<string, LeadSingerImage>(),
      error: error.message,
    };
  }

  const imagesByLeadSingerId = new Map<string, LeadSingerImage>();

  for (const row of (data ?? []) as LeadSingerImageRow[]) {
    if (imagesByLeadSingerId.has(row.lead_singer_id)) {
      continue;
    }

    const url = buildBucketImageUrl(row.image_key);
    if (!url) {
      continue;
    }

    imagesByLeadSingerId.set(row.lead_singer_id, {
      url,
      alt_text: row.alt_text,
      width: row.width,
      height: row.height,
    });
  }

  return {
    imagesByLeadSingerId,
    error: null,
  };
}
