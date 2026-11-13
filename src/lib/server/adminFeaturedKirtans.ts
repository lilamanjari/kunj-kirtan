import { supabaseAdmin } from "@/lib/supabase-admin";
import { FeatureInputError } from "@/lib/server/adminFeatures";
import { HOME_PRIMARY_KIRTAN_SLOT } from "@/lib/server/homeFeaturedItem";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getFeaturedKirtanOverview() {
  const [features, kirtans] = await Promise.all([
    supabaseAdmin.from("featured_items").select("*").eq("slot", HOME_PRIMARY_KIRTAN_SLOT)
      .order("starts_at", { ascending: true }).order("created_at", { ascending: false }),
    supabaseAdmin.from("playable_kirtans_with_titles")
      .select("id, type, title, display_title, lead_singer, sequence_num, created_at")
      .order("created_at", { ascending: false }).limit(2000),
  ]);
  if (features.error) throw new Error(features.error.message);
  if (kirtans.error) throw new Error(kirtans.error.message);

  const choices = (kirtans.data ?? []).map((kirtan) => ({
    id: kirtan.id as string,
    label: [kirtan.display_title || kirtan.title, kirtan.lead_singer].filter(Boolean).join(" · "),
  }));
  const labels = new Map(choices.map((kirtan) => [kirtan.id, kirtan.label]));

  return {
    features: (features.data ?? []).map((feature) => ({
      ...feature,
      kirtan_name: labels.get(feature.entity_id) ?? "Unavailable kirtan",
    })),
    kirtans: choices,
  };
}

export async function saveFeaturedKirtan(body: Record<string, unknown>) {
  const { id, kirtanId, startsAt, endsAt } = body;
  const validInstant = (value: unknown): value is string =>
    typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));

  if ((id !== undefined && (typeof id !== "string" || !uuid.test(id))) || typeof kirtanId !== "string" || !uuid.test(kirtanId)) {
    throw new FeatureInputError("Choose a kirtan to feature.");
  }
  if (!validInstant(startsAt) || !validInstant(endsAt) || Date.parse(endsAt) <= Date.parse(startsAt) || Date.parse(endsAt) <= Date.now()) {
    throw new FeatureInputError("Choose a valid period that ends after its start and in the future.");
  }

  const { data: kirtan, error: kirtanError } = await supabaseAdmin
    .from("playable_kirtans_with_titles").select("id").eq("id", kirtanId).maybeSingle();
  if (kirtanError) throw new Error(kirtanError.message);
  if (!kirtan) throw new FeatureInputError("Choose a published kirtan with playable audio.");

  const { data: features, error: featureError } = await supabaseAdmin
    .from("featured_items").select("id, starts_at, ends_at, is_active")
    .eq("slot", HOME_PRIMARY_KIRTAN_SLOT).eq("is_active", true);
  if (featureError) throw new Error(featureError.message);

  if (id && !(features ?? []).some((feature) => feature.id === id)) {
    throw new FeatureInputError("This scheduled kirtan is no longer available to edit.", 404);
  }

  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const overlap = (features ?? []).find((feature) => {
    if (feature.id === id) return false;
    const otherStart = feature.starts_at ? Date.parse(feature.starts_at) : Number.NEGATIVE_INFINITY;
    const otherEnd = feature.ends_at ? Date.parse(feature.ends_at) : Number.POSITIVE_INFINITY;
    return otherStart < end && start < otherEnd;
  });
  if (overlap) throw new FeatureInputError("This period overlaps another scheduled featured kirtan. Choose a different time.", 409);

  const payload = {
    slot: HOME_PRIMARY_KIRTAN_SLOT,
    entity_table: "kirtans",
    entity_id: kirtanId,
    title_override: null,
    subtitle: null,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    sort_order: 100,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabaseAdmin.from("featured_items").update(payload).eq("id", id).eq("slot", HOME_PRIMARY_KIRTAN_SLOT)
    : supabaseAdmin.from("featured_items").insert(payload);
  const result = await query.select("id").single();
  if (result.error) throw new Error(result.error.message);
  return result.data.id as string;
}
