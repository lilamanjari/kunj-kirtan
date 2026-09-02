import { buildBucketImageUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";

type LeadSingerImageRow = {
  lead_singer_id: string;
  image_key: string;
  alt_text: string | null;
  focus_x: number | null;
  focus_y: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type LeadSingerImage = {
  url: string;
  alt_text: string | null;
  focus_x: number | null;
  focus_y: number | null;
  width: number | null;
  height: number | null;
};

function isMissingFocusColumnError(message: string | undefined) {
  return (
    message?.includes("lead_singer_images.focus_x does not exist") ||
    message?.includes("lead_singer_images.focus_y does not exist")
  );
}

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

  const { data: dataWithFocus, error: errorWithFocus } = await supabase
    .from("lead_singer_images")
    .select("lead_singer_id, image_key, alt_text, focus_x, focus_y, width, height, created_at")
    .in("lead_singer_id", uniqueLeadSingerIds)
    .order("created_at", { ascending: false });

  let data = dataWithFocus;

  if (errorWithFocus) {
    if (!isMissingFocusColumnError(errorWithFocus.message)) {
      return {
        imagesByLeadSingerId: new Map<string, LeadSingerImage>(),
        error: errorWithFocus.message,
      };
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("lead_singer_images")
      .select("lead_singer_id, image_key, alt_text, width, height, created_at")
      .in("lead_singer_id", uniqueLeadSingerIds)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return {
        imagesByLeadSingerId: new Map<string, LeadSingerImage>(),
        error: fallbackError.message,
      };
    }

    data = (fallbackData ?? []).map((row) => ({
      ...row,
      focus_x: null,
      focus_y: null,
    }));
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
      focus_x: row.focus_x,
      focus_y: row.focus_y,
      width: row.width,
      height: row.height,
    });
  }

  return {
    imagesByLeadSingerId,
    error: null,
  };
}
