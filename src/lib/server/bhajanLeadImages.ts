import { fetchPrimaryLeadSingerImages, type LeadSingerImage } from "@/lib/server/leadSingerImages";
import { supabase } from "@/lib/supabase";

type KirtanLeadRow = {
  id: string;
  lead_singer_id: string | null;
};

export async function fetchBhajanLeadSingerImagesByKirtanId(
  kirtanIds: string[],
) {
  const uniqueKirtanIds = Array.from(new Set(kirtanIds.filter(Boolean)));

  if (uniqueKirtanIds.length === 0) {
    return {
      imagesByKirtanId: new Map<string, LeadSingerImage>(),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("playable_kirtans")
    .select("id, lead_singer_id")
    .in("id", uniqueKirtanIds);

  if (error) {
    return {
      imagesByKirtanId: new Map<string, LeadSingerImage>(),
      error: error.message,
    };
  }

  const leadRows = (data ?? []) as KirtanLeadRow[];
  const leadSingerIds = Array.from(
    new Set(
      leadRows.map((row) => row.lead_singer_id).filter((value): value is string => Boolean(value)),
    ),
  );

  const { imagesByLeadSingerId, error: imageError } =
    await fetchPrimaryLeadSingerImages(leadSingerIds);

  if (imageError) {
    return {
      imagesByKirtanId: new Map<string, LeadSingerImage>(),
      error: imageError,
    };
  }

  const imagesByKirtanId = new Map<string, LeadSingerImage>();

  for (const row of leadRows) {
    if (!row.lead_singer_id) continue;
    const image = imagesByLeadSingerId.get(row.lead_singer_id);
    if (image) {
      imagesByKirtanId.set(row.id, image);
    }
  }

  return {
    imagesByKirtanId,
    error: null,
  };
}
