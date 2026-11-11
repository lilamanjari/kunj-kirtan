import { supabaseAdmin } from "@/lib/supabase-admin";
import { HOME_CURRENT_VRATA_SLOT } from "@/lib/server/homeFeaturedItem";
import type { AdminFeature, FeatureOverview } from "@/lib/admin/features";

export class FeatureInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function getFeatureOverview(): Promise<FeatureOverview> {
  const [items, occasions] = await Promise.all([
    supabaseAdmin.from("featured_items").select("*").eq("slot", HOME_CURRENT_VRATA_SLOT)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabaseAdmin.from("tags").select("id, name, description, slug, published")
      .eq("category", "occasion").order("name"),
  ]);
  if (items.error) throw new Error(items.error.message);
  if (occasions.error) throw new Error(occasions.error.message);
  const rows = items.data ?? [];
  const names = new Map((occasions.data ?? []).map((tag) => [tag.id, tag.name]));
  // Existing features may reference entities beyond the Occasion workflow.
  for (const table of ["tags", "kirtans", "lead_singers"] as const) {
    const ids = rows.filter((row) => row.entity_table === table && !names.has(row.entity_id)).map((row) => row.entity_id);
    if (!ids.length) continue;
    const nameColumn = table === "tags" ? "name" : table === "kirtans" ? "title" : "display_name";
    const result = await supabaseAdmin.from(table).select(`id, ${nameColumn}`).in("id", ids);
    if (result.error) throw new Error(result.error.message);
    for (const row of result.data ?? []) {
      const entity = row as unknown as Record<string, string>;
      names.set(entity.id, entity[nameColumn]);
    }
  }
  return {
    features: rows.map((row) => ({ ...row, entity_name: names.get(row.entity_id) ?? "Unavailable item" })) as AdminFeature[],
    occasions: occasions.data ?? [],
  };
}

export async function saveFeature(body: Record<string, unknown>) {
  const { id, occasionId, title, subtitle, startsAt, endsAt } = body;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ((id !== undefined && (typeof id !== "string" || !uuid.test(id))) || typeof occasionId !== "string" || !uuid.test(occasionId)) {
    throw new FeatureInputError("Choose an Occasion to feature.");
  }
  if (typeof title !== "string" || !title.trim() || title.length > 160 || typeof subtitle !== "string" || subtitle.length > 1000) {
    throw new FeatureInputError("Add a title (up to 160 characters) and a subtitle of up to 1,000 characters.");
  }
  const validInstant = (value: unknown): value is string => typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
  if (!validInstant(startsAt) || !validInstant(endsAt) || Date.parse(endsAt) <= Date.parse(startsAt) || Date.parse(endsAt) <= Date.now()) {
    throw new FeatureInputError("Choose a valid period that ends after its start and in the future.");
  }
  const { data: tag, error } = await supabaseAdmin.from("tags").select("id, published, slug")
    .eq("id", occasionId).eq("category", "occasion").maybeSingle();
  if (error) throw new Error(error.message);
  if (!tag?.published || !tag.slug) throw new FeatureInputError("Publish this Occasion and give it a public URL before featuring it.");

  // Avoid a saved feature silently losing to a higher-priority overlapping row.
  const { features } = await getFeatureOverview();
  if (id && !features.some((feature) => feature.id === id && feature.entity_table === "tags")) {
    throw new FeatureInputError("This feature is no longer available to edit.", 404);
  }
  const overlap = features.find((feature) => feature.id !== id && feature.is_active &&
    (!feature.ends_at || Date.parse(feature.ends_at) > Date.parse(startsAt)) &&
    (!feature.starts_at || Date.parse(feature.starts_at) < Date.parse(endsAt)));
  if (overlap) throw new FeatureInputError(`This period overlaps “${overlap.title_override || overlap.entity_name}”. Edit or end that feature first, or choose a later start.`, 409);

  const payload = {
    slot: HOME_CURRENT_VRATA_SLOT, entity_table: "tags", entity_id: occasionId,
    title_override: title.trim(), subtitle: subtitle.trim() || null,
    starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
    sort_order: 100, is_active: true, updated_at: new Date().toISOString(),
  };
  const query = id ? supabaseAdmin.from("featured_items").update(payload).eq("id", id).eq("slot", HOME_CURRENT_VRATA_SLOT)
    : supabaseAdmin.from("featured_items").insert(payload);
  const result = await query.select("id").single();
  if (result.error) throw new Error(result.error.message);
  return result.data.id as string;
}
