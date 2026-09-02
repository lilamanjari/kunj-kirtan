import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import type {
  AdminKirtanDetail,
  AdminKirtanListItem,
  AdminLeadSingerDetail,
  AdminLeadSingerOption,
  AdminLeadSingerKirtanSummary,
  AdminLeadSingerSummary,
  AdminSangaDetail,
  AdminSangaOption,
  AdminSangaSummary,
  AdminTagDetail,
  AdminTagSummary,
} from "@/lib/admin/types";
import type { KirtanType, RecordedDatePrecision } from "@/types/kirtan";

type KirtanStatusFilter = "all" | "published" | "hidden";

function isBhajanType(type: KirtanType) {
  return type === "BHJ";
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function tokenizeSearch(search: string) {
  return Array.from(
    new Set(
      search
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  );
}

type SearchField =
  | "base_title"
  | "detail_title"
  | "lead_singer"
  | "sanga"
  | "sequence_num"
  | "id";

const SEARCH_FIELD_WEIGHTS: Record<SearchField, number> = {
  base_title: 70,
  detail_title: 65,
  lead_singer: 55,
  sanga: 40,
  sequence_num: 60,
  id: 120,
};

function pushSearchMatch(
  matches: Map<string, { score: number; matchedTokens: Set<string> }>,
  token: string,
  field: SearchField,
  ids: Array<string | null | undefined>,
) {
  for (const id of ids) {
    if (!id) continue;

    const current = matches.get(id) ?? {
      score: 0,
      matchedTokens: new Set<string>(),
    };

    current.score += SEARCH_FIELD_WEIGHTS[field];
    current.matchedTokens.add(token);
    matches.set(id, current);
  }
}

function compareIsoDateDesc(left: string | null | undefined, right: string | null | undefined) {
  const leftValue = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightValue = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightValue - leftValue;
}

type AdminListSearchRow = {
  id: string;
  title: string | null;
  type: KirtanType;
  published: boolean | null;
  created_at: string | null;
  recorded_date: string | null;
  sequence_num: number | null;
  recorded_date_precision: RecordedDatePrecision | null;
  lead_singer_id: string | null;
  lead_singers:
    | { display_name?: string | null }
    | Array<{ display_name?: string | null }>
    | null;
  sangas: { name?: string | null } | Array<{ name?: string | null }> | null;
  audio_files:
    | { duration_seconds?: number | null; is_current?: boolean | null }
    | Array<{ duration_seconds?: number | null; is_current?: boolean | null }>
    | null;
};

function rankAdminSearchResults(
  rows: AdminListSearchRow[],
  normalizedSearch: string,
  matches: Map<string, { score: number; matchedTokens: Set<string> }>,
) {
  const normalizedPhrase = normalizedSearch.toLowerCase();

  return [...rows].sort((left, right) => {
    const leftMatch = matches.get(left.id);
    const rightMatch = matches.get(right.id);
    const leftTokenCount = leftMatch?.matchedTokens.size ?? 0;
    const rightTokenCount = rightMatch?.matchedTokens.size ?? 0;

    if (leftTokenCount !== rightTokenCount) {
      return rightTokenCount - leftTokenCount;
    }

    const leftLead = (mapJoinedName(left.lead_singers) ?? "").toLowerCase();
    const rightLead = (mapJoinedName(right.lead_singers) ?? "").toLowerCase();
    const leftSanga = (mapJoinedName(left.sangas) ?? "").toLowerCase();
    const rightSanga = (mapJoinedName(right.sangas) ?? "").toLowerCase();
    const leftTitle = (left.title ?? "").toLowerCase();
    const rightTitle = (right.title ?? "").toLowerCase();

    const leftPhraseBonus =
      (leftTitle.includes(normalizedPhrase) ? 30 : 0) +
      (leftLead.includes(normalizedPhrase) ? 25 : 0) +
      (leftSanga.includes(normalizedPhrase) ? 15 : 0);
    const rightPhraseBonus =
      (rightTitle.includes(normalizedPhrase) ? 30 : 0) +
      (rightLead.includes(normalizedPhrase) ? 25 : 0) +
      (rightSanga.includes(normalizedPhrase) ? 15 : 0);

    const leftScore = (leftMatch?.score ?? 0) + leftPhraseBonus;
    const rightScore = (rightMatch?.score ?? 0) + rightPhraseBonus;

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    if (Boolean(left.published) !== Boolean(right.published)) {
      return left.published ? -1 : 1;
    }

    const recordedDateComparison = compareIsoDateDesc(left.recorded_date, right.recorded_date);
    if (recordedDateComparison !== 0) {
      return recordedDateComparison;
    }

    const createdAtComparison = compareIsoDateDesc(left.created_at, right.created_at);
    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return (left.title ?? "").localeCompare(right.title ?? "", undefined, {
      sensitivity: "base",
    });
  });
}

async function collectAdminKirtanSearchMatches(tokens: string[]) {
  const matches = new Map<string, { score: number; matchedTokens: Set<string> }>();

  for (const token of tokens) {
    const [
      { data: baseTitleRows, error: baseTitleError },
      { data: detailTitleRows, error: detailTitleError },
      { data: leadRows, error: leadError },
      { data: sangaRows, error: sangaError },
    ] = await Promise.all([
      supabaseAdmin.from("kirtans").select("id").ilike("title", `%${token}%`).limit(200),
      supabaseAdmin
        .from("kirtan_titles")
        .select("kirtan_id")
        .ilike("title", `%${token}%`)
        .limit(200),
      supabaseAdmin
        .from("lead_singers")
        .select("id")
        .ilike("display_name", `%${token}%`)
        .limit(200),
      supabaseAdmin.from("sangas").select("id").ilike("name", `%${token}%`).limit(200),
    ]);

    if (baseTitleError) {
      throw new Error(baseTitleError.message);
    }
    if (detailTitleError) {
      throw new Error(detailTitleError.message);
    }
    if (leadError) {
      throw new Error(leadError.message);
    }
    if (sangaError) {
      throw new Error(sangaError.message);
    }

    pushSearchMatch(
      matches,
      token,
      "base_title",
      (baseTitleRows ?? []).map((row) => row.id),
    );
    pushSearchMatch(
      matches,
      token,
      "detail_title",
      (detailTitleRows ?? []).map((row) => row.kirtan_id),
    );

    const leadSingerIds = (leadRows ?? [])
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value));

    if (leadSingerIds.length > 0) {
      const { data: leadKirtans, error: leadKirtansError } = await supabaseAdmin
        .from("kirtans")
        .select("id")
        .in("lead_singer_id", leadSingerIds)
        .limit(200);

      if (leadKirtansError) {
        throw new Error(leadKirtansError.message);
      }

      pushSearchMatch(
        matches,
        token,
        "lead_singer",
        (leadKirtans ?? []).map((row) => row.id),
      );
    }

    const sangaIds = (sangaRows ?? [])
      .map((row) => row.id)
      .filter((value): value is string => Boolean(value));

    if (sangaIds.length > 0) {
      const { data: sangaKirtans, error: sangaKirtansError } = await supabaseAdmin
        .from("kirtans")
        .select("id")
        .in("sanga_id", sangaIds)
        .limit(200);

      if (sangaKirtansError) {
        throw new Error(sangaKirtansError.message);
      }

      pushSearchMatch(
        matches,
        token,
        "sanga",
        (sangaKirtans ?? []).map((row) => row.id),
      );
    }

    if (/^\d+$/.test(token)) {
      const { data: sequenceRows, error: sequenceError } = await supabaseAdmin
        .from("kirtans")
        .select("id")
        .eq("sequence_num", Number(token))
        .limit(200);

      if (sequenceError) {
        throw new Error(sequenceError.message);
      }

      pushSearchMatch(
        matches,
        token,
        "sequence_num",
        (sequenceRows ?? []).map((row) => row.id),
      );
    }

    if (looksLikeUuid(token)) {
      const { data: idRows, error: idError } = await supabaseAdmin
        .from("kirtans")
        .select("id")
        .eq("id", token)
        .limit(1);

      if (idError) {
        throw new Error(idError.message);
      }

      pushSearchMatch(
        matches,
        token,
        "id",
        (idRows ?? []).map((row) => row.id),
      );
    }
  }

  return matches;
}

export function slugifyTagName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const slugifyLeadSingerName = slugifyTagName;

function mapTitleRows(
  rows: Array<{ kind: string | null; title: string | null }> | null | undefined,
) {
  return (rows ?? [])
    .filter(
      (row): row is { kind: "first_line" | "official"; title: string } =>
        (row.kind === "first_line" || row.kind === "official") &&
        typeof row.title === "string" &&
        row.title.trim().length > 0,
    )
    .sort((left, right) =>
      left.kind === right.kind ? 0 : left.kind === "first_line" ? -1 : 1,
    );
}

function mapJoinedName(
  relation: { display_name?: string | null; name?: string | null } | Array<{ display_name?: string | null; name?: string | null }> | null | undefined,
) {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    const first = relation[0];
    return first?.display_name ?? first?.name ?? null;
  }
  return relation.display_name ?? relation.name ?? null;
}

export async function listAdminKirtans({
  search,
  type,
  status,
  selectedId,
}: {
  search?: string | null;
  type?: KirtanType | "all" | null;
  status?: KirtanStatusFilter | null;
  selectedId?: string | null;
}) {
  const normalizedSearch = search?.trim() ?? "";
  const hasSearch = normalizedSearch.length > 0;
  const hasTypeFilter = Boolean(type && type !== "all");
  const hasStatusFilter = Boolean(status && status !== "all");
  const searchTokens = normalizedSearch ? tokenizeSearch(normalizedSearch) : [];
  const searchMatches = searchTokens.length
    ? await collectAdminKirtanSearchMatches(searchTokens)
    : new Map<string, { score: number; matchedTokens: Set<string> }>();

  function buildBaseQuery(withCount = false) {
    return supabaseAdmin
      .from("kirtans")
      .select(
        `
      id,
      title,
      type,
      published,
      created_at,
      recorded_date,
      sequence_num,
      recorded_date_precision,
      lead_singer_id,
      lead_singers(display_name),
      sangas(name),
      audio_files!left(duration_seconds, is_current)
    `,
        withCount ? { count: "exact" } : undefined,
      );
  }

  function buildCountQuery() {
    return supabaseAdmin
      .from("kirtans")
      .select("id", { count: "exact", head: true });
  }

  let query = buildBaseQuery()
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false, nullsFirst: false })
    .limit(200);

  let filteredCountQuery = buildCountQuery();

  if (type && type !== "all") {
    query = query.eq("type", type);
    filteredCountQuery = filteredCountQuery.eq("type", type);
  }

  if (status === "published") {
    query = query.eq("published", true);
    filteredCountQuery = filteredCountQuery.eq("published", true);
  } else if (status === "hidden") {
    query = query.eq("published", false);
    filteredCountQuery = filteredCountQuery.eq("published", false);
  }

  if (normalizedSearch) {
    const matchingKirtanIds = Array.from(searchMatches.keys());

    if (matchingKirtanIds.length === 0) {
      return {
        kirtans: [],
        filteredCount: 0,
        totalCount: (
          await supabaseAdmin.from("kirtans").select("id", { count: "exact", head: true })
        ).count ?? 0,
        hasActiveFilters: true,
      };
    }

    query = buildBaseQuery().in("id", matchingKirtanIds).limit(1000);
    filteredCountQuery = buildCountQuery().in("id", matchingKirtanIds);

    if (type && type !== "all") {
      query = query.eq("type", type);
      filteredCountQuery = filteredCountQuery.eq("type", type);
    }

    if (status === "published") {
      query = query.eq("published", true);
      filteredCountQuery = filteredCountQuery.eq("published", true);
    } else if (status === "hidden") {
      query = query.eq("published", false);
      filteredCountQuery = filteredCountQuery.eq("published", false);
    }
  }

  const [
    { data, error },
    { count: filteredCount, error: filteredCountError },
    { count: totalCount, error: totalCountError },
  ] = await Promise.all([
    query,
    filteredCountQuery,
    supabaseAdmin.from("kirtans").select("id", { count: "exact", head: true }),
  ]);

  if (error) {
    throw new Error(error.message);
  }
  if (filteredCountError) {
    throw new Error(filteredCountError.message);
  }
  if (totalCountError) {
    throw new Error(totalCountError.message);
  }

  const rankedRows = normalizedSearch
    ? rankAdminSearchResults(
        (data ?? []) as AdminListSearchRow[],
        normalizedSearch,
        searchMatches,
      ).slice(0, 200)
    : ((data ?? []) as AdminListSearchRow[]);

  const { imagesByLeadSingerId, error: leadSingerImageError } =
    await fetchPrimaryLeadSingerImages(
      rankedRows
        .map((row) => row.lead_singer_id)
        .filter((value): value is string => Boolean(value)),
    );

  if (leadSingerImageError) {
    throw new Error(leadSingerImageError);
  }

  const kirtans = rankedRows.map((row) => {
    const leadSingerId = row.lead_singer_id;
    const leadSingerImage = leadSingerId
      ? imagesByLeadSingerId.get(leadSingerId)
      : null;

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      type: row.type as KirtanType,
      published: Boolean(row.published),
      created_at: (row.created_at as string | null) ?? null,
      recorded_date: (row.recorded_date as string | null) ?? null,
      sequence_num: (row.sequence_num as number | null) ?? null,
      recorded_date_precision:
        (row.recorded_date_precision as RecordedDatePrecision | null) ?? null,
      lead_singer: mapJoinedName(
        row.lead_singers as
          | { display_name?: string | null }
          | Array<{ display_name?: string | null }>
          | null,
      ),
      lead_singer_image_url: leadSingerImage?.url ?? null,
      lead_singer_image_alt:
        leadSingerImage?.alt_text ??
        mapJoinedName(
          row.lead_singers as
            | { display_name?: string | null }
            | Array<{ display_name?: string | null }>
            | null,
        ),
      lead_singer_image_focus_x: leadSingerImage?.focus_x ?? null,
      lead_singer_image_focus_y: leadSingerImage?.focus_y ?? null,
      duration_seconds:
        ((Array.isArray(row.audio_files) ? row.audio_files : [row.audio_files]).find(
          (audio) => audio?.is_current,
        )?.duration_seconds as number | null | undefined) ?? null,
    };
  }) satisfies AdminKirtanListItem[];

  if (
    selectedId &&
    !kirtans.some((kirtan) => kirtan.id === selectedId)
  ) {
    const { data: selectedRow, error: selectedError } = await buildBaseQuery()
      .eq("id", selectedId)
      .maybeSingle();

    if (selectedError) {
      throw new Error(selectedError.message);
    }

    if (selectedRow) {
      const typedSelectedRow = selectedRow as AdminListSearchRow;
      const selectedLeadSingerId = typedSelectedRow.lead_singer_id;
      const selectedImageLookup =
        selectedLeadSingerId && !imagesByLeadSingerId.has(selectedLeadSingerId)
          ? await fetchPrimaryLeadSingerImages([selectedLeadSingerId])
          : null;

      if (selectedImageLookup?.error) {
        throw new Error(selectedImageLookup.error);
      }

      const selectedLeadSingerImage = selectedLeadSingerId
        ? imagesByLeadSingerId.get(selectedLeadSingerId) ??
          selectedImageLookup?.imagesByLeadSingerId.get(selectedLeadSingerId) ??
          null
        : null;

      kirtans.unshift({
        id: String(typedSelectedRow.id),
        title: String(typedSelectedRow.title ?? ""),
        type: typedSelectedRow.type as KirtanType,
        published: Boolean(typedSelectedRow.published),
        created_at: (typedSelectedRow.created_at as string | null) ?? null,
        recorded_date: (typedSelectedRow.recorded_date as string | null) ?? null,
        sequence_num: (typedSelectedRow.sequence_num as number | null) ?? null,
        recorded_date_precision:
          (typedSelectedRow.recorded_date_precision as RecordedDatePrecision | null) ??
          null,
        lead_singer: mapJoinedName(
          typedSelectedRow.lead_singers as
            | { display_name?: string | null }
            | Array<{ display_name?: string | null }>
            | null,
        ),
        lead_singer_image_url: selectedLeadSingerImage?.url ?? null,
        lead_singer_image_alt:
          selectedLeadSingerImage?.alt_text ??
          mapJoinedName(
            typedSelectedRow.lead_singers as
              | { display_name?: string | null }
              | Array<{ display_name?: string | null }>
              | null,
          ),
        lead_singer_image_focus_x: selectedLeadSingerImage?.focus_x ?? null,
        lead_singer_image_focus_y: selectedLeadSingerImage?.focus_y ?? null,
        duration_seconds:
          ((Array.isArray(typedSelectedRow.audio_files)
            ? typedSelectedRow.audio_files
            : [typedSelectedRow.audio_files]).find((audio) => audio?.is_current)
            ?.duration_seconds as number | null | undefined) ?? null,
      });
    }
  }

  return {
    kirtans,
    filteredCount: filteredCount ?? kirtans.length,
    totalCount: totalCount ?? kirtans.length,
    hasActiveFilters: hasSearch || hasTypeFilter || hasStatusFilter,
  };
}

export async function getAdminKirtanDetail(id: string) {
  const { data: kirtan, error: kirtanError } = await supabaseAdmin
    .from("kirtans")
    .select(`
      id,
      title,
      type,
      published,
      created_at,
      recorded_date,
      sequence_num,
      recorded_date_precision,
      lead_singer_id,
      lead_singers(display_name),
      sanga_id,
      sangas(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (kirtanError) {
    throw new Error(kirtanError.message);
  }

  if (!kirtan) {
    return null;
  }

  const { data: titles, error: titlesError } = await supabaseAdmin
    .from("kirtan_titles")
    .select("kind, title")
    .eq("kirtan_id", id)
    .in("kind", ["first_line", "official"]);

  if (titlesError) {
    throw new Error(titlesError.message);
  }

  const { data: audioFile, error: audioError } = await supabaseAdmin
    .from("audio_files")
    .select("file_url, file_name, duration_seconds")
    .eq("kirtan_id", id)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (audioError) {
    throw new Error(audioError.message);
  }

  const { data: links, error: tagsError } = await supabaseAdmin
    .from("kirtan_tags")
    .select(`
      tag_id,
      tags (
        id,
        name,
        slug,
        category
      )
    `)
    .eq("kirtan_id", id);

  if (tagsError) {
    throw new Error(tagsError.message);
  }

  const mappedTitles = mapTitleRows(
    (titles ?? []) as Array<{ kind: string | null; title: string | null }>,
  );

  const { imagesByLeadSingerId, error: leadSingerImageError } =
    kirtan.lead_singer_id
      ? await fetchPrimaryLeadSingerImages([kirtan.lead_singer_id])
      : { imagesByLeadSingerId: new Map(), error: null };

  if (leadSingerImageError) {
    throw new Error(leadSingerImageError);
  }

  const leadSingerImage = kirtan.lead_singer_id
    ? imagesByLeadSingerId.get(kirtan.lead_singer_id)
    : null;

  const displayTitle = getDisplayKirtanTitle({
    type: kirtan.type as KirtanType,
    title: kirtan.title ?? "",
    display_title: null,
    official_title: mappedTitles.find((row) => row.kind === "official")?.title ?? null,
    first_line_title:
      mappedTitles.find((row) => row.kind === "first_line")?.title ?? null,
  });

  return {
    id: kirtan.id,
    title: kirtan.title ?? "",
    display_title: displayTitle,
    type: kirtan.type as KirtanType,
    published: Boolean(kirtan.published),
    created_at: kirtan.created_at ?? null,
    recorded_date: kirtan.recorded_date ?? null,
    sequence_num: kirtan.sequence_num ?? null,
    recorded_date_precision:
      (kirtan.recorded_date_precision as RecordedDatePrecision | null) ?? null,
    lead_singer: mapJoinedName(
      kirtan.lead_singers as { display_name?: string | null } | Array<{ display_name?: string | null }> | null,
    ),
    lead_singer_id: kirtan.lead_singer_id ?? null,
    lead_singer_image_url: leadSingerImage?.url ?? null,
    lead_singer_image_alt:
      leadSingerImage?.alt_text ??
      mapJoinedName(
        kirtan.lead_singers as
          | { display_name?: string | null }
          | Array<{ display_name?: string | null }>
          | null,
      ),
    lead_singer_image_focus_x: leadSingerImage?.focus_x ?? null,
    lead_singer_image_focus_y: leadSingerImage?.focus_y ?? null,
    sanga: mapJoinedName(
      kirtan.sangas as { name?: string | null } | Array<{ name?: string | null }> | null,
    ),
    audio_url: audioFile?.file_url ?? null,
    audio_file_name: audioFile?.file_name ?? null,
    duration_seconds: audioFile?.duration_seconds ?? null,
    titles: mappedTitles,
    tags: (links ?? [])
      .map((row) => {
        const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
        if (!tag?.id || !tag.name || !tag.slug || !tag.category) {
          return null;
        }

        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          category: tag.category,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
  } satisfies AdminKirtanDetail;
}

export async function listAdminTags({
  search,
  category,
  publishedOnly,
}: {
  search?: string | null;
  category?: string | "all" | null;
  publishedOnly?: boolean;
}) {
  let query = supabaseAdmin
    .from("tags")
    .select("id, name, slug, category, published, browse_visible")
    .order("name", { ascending: true })
    .limit(250);

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (publishedOnly) {
    query = query.eq("published", true);
  }

  const { data: tags, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const tagIds = (tags ?? []).map((tag) => tag.id);
  const countsById = new Map<string, number>();

  if (tagIds.length > 0) {
    const { data: links, error: linkError } = await supabaseAdmin
      .from("kirtan_tags")
      .select("tag_id")
      .in("tag_id", tagIds);

    if (linkError) {
      throw new Error(linkError.message);
    }

    for (const row of links ?? []) {
      const tagId = row.tag_id;
      if (!tagId) continue;
      countsById.set(tagId, (countsById.get(tagId) ?? 0) + 1);
    }
  }

  return (tags ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    category: tag.category,
    usage_count: countsById.get(tag.id) ?? 0,
    published: Boolean(tag.published),
    browse_visible: Boolean(tag.browse_visible),
  })) satisfies AdminTagSummary[];
}

export async function getAdminTagDetail(id: string) {
  const { data: tag, error } = await supabaseAdmin
    .from("tags")
    .select("id, name, slug, category, published, browse_visible")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!tag) {
    return null;
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from("kirtan_tags")
    .select("kirtan_id")
    .eq("tag_id", id);

  if (linksError) {
    throw new Error(linksError.message);
  }

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    category: tag.category,
    usage_count: (links ?? []).length,
    published: Boolean(tag.published),
    browse_visible: Boolean(tag.browse_visible),
    linked_kirtan_ids: (links ?? [])
      .map((row) => row.kirtan_id)
      .filter((value): value is string => Boolean(value)),
  } satisfies AdminTagDetail;
}

export async function listAdminKirtanFormOptions() {
  const [{ data: leadSingers, error: leadSingerError }, { data: sangas, error: sangaError }] =
    await Promise.all([
      supabaseAdmin
        .from("lead_singers")
        .select("id, display_name")
        .order("display_name", { ascending: true })
        .limit(500),
      supabaseAdmin
        .from("sangas")
        .select("id, name")
        .order("name", { ascending: true })
        .limit(500),
    ]);

  if (leadSingerError) {
    throw new Error(leadSingerError.message);
  }

  if (sangaError) {
    throw new Error(sangaError.message);
  }

  return {
    leadSingers: (leadSingers ?? [])
      .filter(
        (row): row is { id: string; display_name: string } =>
          Boolean(row.id) && Boolean(row.display_name),
      )
      .map((row) => ({
        id: row.id,
        display_name: row.display_name,
      })) satisfies AdminLeadSingerOption[],
    sangas: (sangas ?? [])
      .filter(
        (row): row is { id: string; name: string } =>
          Boolean(row.id) && Boolean(row.name),
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
      })) satisfies AdminSangaOption[],
  };
}

export async function getAdminTagCategories() {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select("category")
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.category).filter(Boolean)),
  );
}

export async function listAdminSangas({
  search,
}: {
  search?: string | null;
}) {
  let query = supabaseAdmin
    .from("sangas")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(250);

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data: sangas, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const sangaIds = (sangas ?? []).map((sanga) => sanga.id);
  const kirtanCountsById = new Map<string, number>();
  const leadSingerCountsById = new Map<string, number>();

  if (sangaIds.length > 0) {
    const [{ data: kirtans, error: kirtansError }, { data: leadSingers, error: leadSingersError }] =
      await Promise.all([
        supabaseAdmin
          .from("kirtans")
          .select("sanga_id")
          .in("sanga_id", sangaIds),
        supabaseAdmin
          .from("lead_singers")
          .select("home_sanga")
          .in("home_sanga", sangaIds),
      ]);

    if (kirtansError) {
      throw new Error(kirtansError.message);
    }
    if (leadSingersError) {
      throw new Error(leadSingersError.message);
    }

    for (const row of kirtans ?? []) {
      const sangaId = row.sanga_id;
      if (!sangaId) continue;
      kirtanCountsById.set(sangaId, (kirtanCountsById.get(sangaId) ?? 0) + 1);
    }

    for (const row of leadSingers ?? []) {
      const sangaId = row.home_sanga;
      if (!sangaId) continue;
      leadSingerCountsById.set(
        sangaId,
        (leadSingerCountsById.get(sangaId) ?? 0) + 1,
      );
    }
  }

  return (sangas ?? []).map((sanga) => {
    const kirtanCount = kirtanCountsById.get(sanga.id) ?? 0;
    const leadSingerCount = leadSingerCountsById.get(sanga.id) ?? 0;

    return {
      id: sanga.id,
      name: sanga.name,
      kirtan_count: kirtanCount,
      lead_singer_count: leadSingerCount,
      total_usage_count: kirtanCount + leadSingerCount,
    };
  }) satisfies AdminSangaSummary[];
}

export async function getAdminSangaDetail(id: string) {
  const { data: sanga, error } = await supabaseAdmin
    .from("sangas")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!sanga) {
    return null;
  }

  const [{ data: kirtans, error: kirtansError }, { data: leadSingers, error: leadSingersError }] =
    await Promise.all([
      supabaseAdmin
        .from("kirtans")
        .select("id")
        .eq("sanga_id", id),
      supabaseAdmin
        .from("lead_singers")
        .select("id")
        .eq("home_sanga", id),
    ]);

  if (kirtansError) {
    throw new Error(kirtansError.message);
  }
  if (leadSingersError) {
    throw new Error(leadSingersError.message);
  }

  const linkedKirtanIds = (kirtans ?? [])
    .map((row) => row.id)
    .filter((value): value is string => Boolean(value));
  const linkedLeadSingerIds = (leadSingers ?? [])
    .map((row) => row.id)
    .filter((value): value is string => Boolean(value));

  return {
    id: sanga.id,
    name: sanga.name,
    kirtan_count: linkedKirtanIds.length,
    lead_singer_count: linkedLeadSingerIds.length,
    total_usage_count: linkedKirtanIds.length + linkedLeadSingerIds.length,
    linked_kirtan_ids: linkedKirtanIds,
    linked_lead_singer_ids: linkedLeadSingerIds,
  } satisfies AdminSangaDetail;
}

type AdminLeadSingerListRow = {
  id: string;
  canonical_name: string | null;
  display_name: string | null;
  slug: string | null;
  description: string | null;
  priority: number | null;
  is_identified: boolean | null;
  home_sanga: string | null;
  sangas: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type AdminLeadSingerDetailKirtanRow = {
  id: string;
  title: string | null;
  type: KirtanType;
  published: boolean | null;
  recorded_date: string | null;
  recorded_date_precision: RecordedDatePrecision | null;
  sequence_num: number | null;
  created_at: string | null;
  audio_files:
    | { duration_seconds?: number | null; is_current?: boolean | null }
    | Array<{ duration_seconds?: number | null; is_current?: boolean | null }>
    | null;
  kirtan_titles:
    | Array<{ kind?: string | null; title?: string | null }>
    | { kind?: string | null; title?: string | null }
    | null;
};

async function getAdminLeadSingerImages(leadSingerIds: string[]) {
  const uniqueLeadSingerIds = Array.from(new Set(leadSingerIds.filter(Boolean)));
  if (uniqueLeadSingerIds.length === 0) {
    return new Map<
      string,
      {
        image_key: string;
        alt_text: string | null;
        url: string | null;
        focus_x: number | null;
        focus_y: number | null;
      }
    >();
  }

  const { data: rowsWithFocus, error: errorWithFocus } = await supabaseAdmin
    .from("lead_singer_images")
    .select("lead_singer_id, image_key, alt_text, focus_x, focus_y, created_at")
    .in("lead_singer_id", uniqueLeadSingerIds)
    .order("created_at", { ascending: false });

  let data = rowsWithFocus;

  if (errorWithFocus) {
    if (
      !errorWithFocus.message.includes("lead_singer_images.focus_x does not exist") &&
      !errorWithFocus.message.includes("lead_singer_images.focus_y does not exist")
    ) {
      throw new Error(errorWithFocus.message);
    }

    const { data: fallbackRows, error: fallbackError } = await supabaseAdmin
      .from("lead_singer_images")
      .select("lead_singer_id, image_key, alt_text, created_at")
      .in("lead_singer_id", uniqueLeadSingerIds)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    data = (fallbackRows ?? []).map((row) => ({
      ...row,
      focus_x: null,
      focus_y: null,
    }));
  }

  const publicImageMapResult = await fetchPrimaryLeadSingerImages(
    uniqueLeadSingerIds,
  );
  const publicImageMap = publicImageMapResult.imagesByLeadSingerId;
  const publicImageError = publicImageMapResult.error;
  if (publicImageError) {
    throw new Error(publicImageError);
  }

  const images = new Map<
    string,
    {
      image_key: string;
      alt_text: string | null;
      url: string | null;
      focus_x: number | null;
      focus_y: number | null;
    }
  >();

  for (const row of data ?? []) {
    if (!row.lead_singer_id || !row.image_key || images.has(row.lead_singer_id)) {
      continue;
    }

    images.set(row.lead_singer_id, {
      image_key: row.image_key,
      alt_text: row.alt_text ?? null,
      url: publicImageMap.get(row.lead_singer_id)?.url ?? null,
      focus_x: row.focus_x ?? publicImageMap.get(row.lead_singer_id)?.focus_x ?? null,
      focus_y: row.focus_y ?? publicImageMap.get(row.lead_singer_id)?.focus_y ?? null,
    });
  }

  return images;
}

function mapLeadSingerSummary(
  leadSinger: AdminLeadSingerListRow,
  kirtanCount: number,
  image?: {
    image_key: string;
    alt_text: string | null;
    url: string | null;
    focus_x: number | null;
    focus_y: number | null;
  } | null,
) {
  return {
    id: leadSinger.id,
    canonical_name: leadSinger.canonical_name ?? leadSinger.display_name ?? "",
    display_name: leadSinger.display_name ?? "",
    slug: leadSinger.slug ?? "",
    description: leadSinger.description ?? null,
    priority: leadSinger.priority ?? 100,
    is_identified: Boolean(leadSinger.is_identified),
    home_sanga_id: leadSinger.home_sanga ?? null,
    home_sanga_name: mapJoinedName(
      leadSinger.sangas as
        | { name?: string | null }
        | Array<{ name?: string | null }>
        | null,
    ),
    image_url: image?.url ?? null,
    image_alt: image?.alt_text ?? leadSinger.display_name ?? null,
    image_key: image?.image_key ?? null,
    image_focus_x: image?.focus_x ?? null,
    image_focus_y: image?.focus_y ?? null,
    kirtan_count: kirtanCount,
  } satisfies AdminLeadSingerSummary;
}

export async function listAdminLeadSingers({
  search,
  identified,
}: {
  search?: string | null;
  identified?: "all" | "identified" | "hidden";
}) {
  let query = supabaseAdmin
    .from("lead_singers")
    .select(
      "id, canonical_name, display_name, slug, description, priority, is_identified, home_sanga, sangas:home_sanga(name)",
    )
    .order("priority", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(500);

  if (search?.trim()) {
    query = query.or(
      [
        `display_name.ilike.%${search.trim()}%`,
        `canonical_name.ilike.%${search.trim()}%`,
        `slug.ilike.%${search.trim()}%`,
      ].join(","),
    );
  }

  if (identified === "identified") {
    query = query.eq("is_identified", true);
  } else if (identified === "hidden") {
    query = query.eq("is_identified", false);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const leads = (data ?? []) as AdminLeadSingerListRow[];
  const leadSingerIds = leads.map((row) => row.id).filter(Boolean);
  const countsById = new Map<string, number>();

  if (leadSingerIds.length > 0) {
    const { data: kirtans, error: kirtansError } = await supabaseAdmin
      .from("kirtans")
      .select("lead_singer_id")
      .in("lead_singer_id", leadSingerIds);

    if (kirtansError) {
      throw new Error(kirtansError.message);
    }

    for (const row of kirtans ?? []) {
      const leadSingerId = row.lead_singer_id;
      if (!leadSingerId) continue;
      countsById.set(
        leadSingerId,
        (countsById.get(leadSingerId) ?? 0) + 1,
      );
    }
  }

  const imagesByLeadSingerId = await getAdminLeadSingerImages(leadSingerIds);

  return leads.map((leadSinger) =>
    mapLeadSingerSummary(
      leadSinger,
      countsById.get(leadSinger.id) ?? 0,
      imagesByLeadSingerId.get(leadSinger.id) ?? null,
    ),
  );
}

export async function listAdminLeadSingerFormOptions() {
  const { data: sangas, error } = await supabaseAdmin
    .from("sangas")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return {
    sangas: (sangas ?? [])
      .filter(
        (row): row is { id: string; name: string } =>
          Boolean(row.id) && Boolean(row.name),
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
      })) satisfies AdminSangaOption[],
  };
}

export async function getAdminLeadSingerDetail(id: string) {
  const { data: leadSinger, error } = await supabaseAdmin
    .from("lead_singers")
    .select(
      "id, canonical_name, display_name, slug, description, priority, is_identified, home_sanga, sangas:home_sanga(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!leadSinger) {
    return null;
  }

  const imagesByLeadSingerId = await getAdminLeadSingerImages([id]);
  const firstKirtanPage = await listAdminLeadSingerKirtans({
    leadSingerId: id,
    limit: 20,
    offset: 0,
  });

  const summary = mapLeadSingerSummary(
    leadSinger as AdminLeadSingerListRow,
    firstKirtanPage.total_count,
    imagesByLeadSingerId.get(id) ?? null,
  );

  return {
    ...summary,
    kirtans: firstKirtanPage.kirtans,
    kirtans_total_count: firstKirtanPage.total_count,
    kirtans_has_more: firstKirtanPage.has_more,
    kirtans_next_offset: firstKirtanPage.next_offset,
  } satisfies AdminLeadSingerDetail;
}

export async function listAdminLeadSingerKirtans({
  leadSingerId,
  limit = 20,
  offset = 0,
}: {
  leadSingerId: string;
  limit?: number;
  offset?: number;
}) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));

  const [{ data: kirtans, error: kirtansError }, { count, error: countError }] =
    await Promise.all([
      supabaseAdmin
        .from("kirtans")
        .select(
          `
            id,
            title,
            type,
            published,
            recorded_date,
            recorded_date_precision,
            sequence_num,
            created_at,
            audio_files!left(duration_seconds, is_current),
            kirtan_titles(kind, title)
          `,
        )
        .eq("lead_singer_id", leadSingerId)
        .order("recorded_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1),
      supabaseAdmin
        .from("kirtans")
        .select("id", { count: "exact", head: true })
        .eq("lead_singer_id", leadSingerId),
    ]);

  if (kirtansError) {
    throw new Error(kirtansError.message);
  }

  if (countError) {
    throw new Error(countError.message);
  }

  const mappedKirtans = ((kirtans ?? []) as AdminLeadSingerDetailKirtanRow[]).map(
    (row) => {
      const titles = mapTitleRows(
        (Array.isArray(row.kirtan_titles)
          ? row.kirtan_titles
          : row.kirtan_titles
            ? [row.kirtan_titles]
            : []) as Array<{ kind: string | null; title: string | null }>,
      );

      const displayTitle = getDisplayKirtanTitle({
        type: row.type,
        title: row.title ?? "",
        display_title: null,
        official_title:
          titles.find((title) => title.kind === "official")?.title ?? null,
        first_line_title:
          titles.find((title) => title.kind === "first_line")?.title ?? null,
      });

      return {
        id: row.id,
        title: displayTitle,
        type: row.type,
        published: Boolean(row.published),
        recorded_date: row.recorded_date ?? null,
        recorded_date_precision:
          (row.recorded_date_precision as RecordedDatePrecision | null) ?? null,
        duration_seconds:
          ((Array.isArray(row.audio_files) ? row.audio_files : [row.audio_files]).find(
            (audio) => audio?.is_current,
          )?.duration_seconds as number | null | undefined) ?? null,
        sequence_num: row.sequence_num ?? null,
      } satisfies AdminLeadSingerKirtanSummary;
    },
  );

  const totalCount = count ?? mappedKirtans.length;
  const nextOffset =
    safeOffset + mappedKirtans.length < totalCount
      ? safeOffset + mappedKirtans.length
      : null;

  return {
    kirtans: mappedKirtans,
    total_count: totalCount,
    has_more: nextOffset !== null,
    next_offset: nextOffset,
  };
}

export function getDisplayListTitle(
  detail: Pick<AdminKirtanDetail, "type" | "title" | "titles">,
) {
  if (!isBhajanType(detail.type)) {
    return detail.title;
  }

  const official = detail.titles.find((row) => row.kind === "official")?.title;
  const firstLine = detail.titles.find((row) => row.kind === "first_line")?.title;
  return official ?? firstLine ?? detail.title;
}
