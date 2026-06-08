// Shared Maha Mantra presentation builder.
// It converts raw DB rows into app-facing KirtanSummary objects with tags and portraits attached.
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  fetchPrimaryLeadSingerImages,
  type LeadSingerImage,
} from "@/lib/server/leadSingerImages";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import type { KirtanSummary, PlayableKirtanRow } from "@/types/kirtan";

type TagFlagsResult = Awaited<ReturnType<typeof fetchKirtanTagFlags>>;
type LeadSingerImagesResult = Awaited<
  ReturnType<typeof fetchPrimaryLeadSingerImages>
>;

type MahaMantraPresentationDeps = {
  fetchTagFlags?: (ids: string[]) => Promise<TagFlagsResult>;
  fetchLeadSingerImages?: (
    leadSingerIds: string[],
  ) => Promise<LeadSingerImagesResult>;
};

function collectIds(
  page: PlayableKirtanRow[],
  featured: PlayableKirtanRow | null,
) {
  const kirtanIds = page.map((kirtan) => kirtan.id);
  if (featured?.id) {
    kirtanIds.unshift(featured.id);
  }

  const leadSingerIds = [
    ...page.map((kirtan) => kirtan.lead_singer_id).filter(Boolean),
    featured?.lead_singer_id,
  ].filter((value): value is string => Boolean(value));

  return { kirtanIds, leadSingerIds };
}

function mapSummary(
  kirtan: PlayableKirtanRow,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
  imagesByLeadSingerId: Map<string, LeadSingerImage>,
): KirtanSummary {
  const leadSingerImage = kirtan.lead_singer_id
    ? imagesByLeadSingerId.get(kirtan.lead_singer_id)
    : null;

  return {
    id: kirtan.id,
    audio_url: kirtan.audio_url ?? "",
    type: "MM",
    title: formatKirtanTitle("MM", kirtan.title),
    lead_singer: kirtan.lead_singer,
    lead_singer_id: kirtan.lead_singer_id ?? null,
    lead_singer_image_url: leadSingerImage?.url ?? null,
    lead_singer_image_alt: leadSingerImage?.alt_text ?? kirtan.lead_singer,
    recorded_date: kirtan.recorded_date,
    recorded_date_precision: kirtan.recorded_date_precision ?? null,
    sanga: kirtan.sanga,
    duration_seconds: kirtan.duration_seconds,
    sequence_num: kirtan.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(kirtan.id),
    is_rare_gem: rareGemIds.has(kirtan.id),
  };
}

export async function buildMahaMantraPresentation(
  page: PlayableKirtanRow[],
  featured: PlayableKirtanRow | null,
  deps: MahaMantraPresentationDeps = {},
) {
  const { kirtanIds, leadSingerIds } = collectIds(page, featured);
  const fetchTagFlags = deps.fetchTagFlags ?? fetchKirtanTagFlags;
  const fetchLeadSingerImages =
    deps.fetchLeadSingerImages ?? fetchPrimaryLeadSingerImages;

  const [
    { harmoniumIds, rareGemIds, error: tagError },
    { imagesByLeadSingerId, error: imageError },
  ] = await Promise.all([
    fetchTagFlags(kirtanIds),
    fetchLeadSingerImages(leadSingerIds),
  ]);

  if (tagError) {
    return {
      mantras: [] as KirtanSummary[],
      featuredKirtan: null as KirtanSummary | null,
      error: tagError,
    };
  }

  if (imageError) {
    return {
      mantras: [] as KirtanSummary[],
      featuredKirtan: null as KirtanSummary | null,
      error: imageError,
    };
  }

  return {
    mantras: page.map((kirtan) =>
      mapSummary(kirtan, harmoniumIds, rareGemIds, imagesByLeadSingerId),
    ),
    featuredKirtan: featured
      ? mapSummary(featured, harmoniumIds, rareGemIds, imagesByLeadSingerId)
      : null,
    error: null,
  };
}
