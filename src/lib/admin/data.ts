import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import type {
  AdminKirtanDetail,
  AdminKirtanListItem,
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
    const textPromises = [
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
    ];

    const [
      { data: baseTitleRows, error: baseTitleError },
      { data: detailTitleRows, error: detailTitleError },
      { data: leadRows, error: leadError },
      { data: sangaRows, error: sangaError },
    ] = await Promise.all(textPromises);

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
}: {
  search?: string | null;
  type?: KirtanType | "all" | null;
  status?: KirtanStatusFilter | null;
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
      lead_singers(display_name),
      sangas(name),
      audio_files!left(duration_seconds, is_current)
    `,
        withCount ? { count: "exact" } : undefined,
      );
  }

  let query = buildBaseQuery()
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false, nullsFirst: false })
    .limit(200);

  let filteredCountQuery = buildBaseQuery(true);

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
    filteredCountQuery = supabaseAdmin
      .from("kirtans")
      .select("id", { count: "exact", head: true })
      .in("id", matchingKirtanIds);

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

  const kirtans = rankedRows.map((row) => ({
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
      row.lead_singers as { display_name?: string | null } | Array<{ display_name?: string | null }> | null,
    ),
    duration_seconds:
      ((Array.isArray(row.audio_files) ? row.audio_files : [row.audio_files]).find(
        (audio) => audio?.is_current,
      )?.duration_seconds as number | null | undefined) ?? null,
  })) satisfies AdminKirtanListItem[];

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
    sanga: mapJoinedName(
      kirtan.sangas as { name?: string | null } | Array<{ name?: string | null }> | null,
    ),
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
