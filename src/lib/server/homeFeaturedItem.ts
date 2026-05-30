import { supabase } from "@/lib/supabase";

export const HOME_CURRENT_VRATA_SLOT = "home_current_vrata";

type FeaturedItemRow = {
  id: string;
  starts_at?: string | null;
  ends_at?: string | null;
  entity_table: "kirtans" | "tags" | "lead_singers";
  entity_id: string;
  title_override: string | null;
  subtitle: string | null;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
};

export type HomeCurrentOccasion = {
  id: string;
  name: string;
  slug: string;
  header: string | null;
  subtitle: string | null;
};

function isActiveNow(item: FeaturedItemRow, now: Date) {
  const startsAt = item.starts_at ? new Date(item.starts_at) : null;
  const endsAt = item.ends_at ? new Date(item.ends_at) : null;

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return true;
}

export async function fetchHomeCurrentOccasion() {
  const now = new Date();

  const { data: featuredRows, error: featuredError } = await supabase
    .from("featured_items")
    .select(
      "id, entity_table, entity_id, title_override, subtitle, starts_at, ends_at",
    )
    .eq("slot", HOME_CURRENT_VRATA_SLOT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (featuredError) {
    return { data: null, error: featuredError.message };
  }

  const featuredRow =
    ((featuredRows ?? []) as FeaturedItemRow[]).find((item) =>
      isActiveNow(item, now),
    ) ?? null;

  if (!featuredRow) {
    return { data: null, error: null };
  }

  const item = featuredRow as FeaturedItemRow;
  if (item.entity_table !== "tags") {
    return {
      data: null,
      error: `Featured slot ${HOME_CURRENT_VRATA_SLOT} must reference the tags table`,
    };
  }

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("id", item.entity_id)
    .eq("published", true)
    .maybeSingle();

  if (tagError) {
    return { data: null, error: tagError.message };
  }

  if (!tag) {
    return { data: null, error: null };
  }

  return {
    data: {
      ...(tag as TagRow),
      header: item.title_override,
      subtitle: item.subtitle,
    } satisfies HomeCurrentOccasion,
    error: null,
  };
}
