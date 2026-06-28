import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const SECRET_HEADER = "x-revalidate-secret";
const CACHE_TAGS = [
  "home",
  "rare-gems",
  "kirtan-page",
  "explore-bhajans",
  "explore-maha-mantras",
  "explore-leads",
  "explore-leads-slugs",
  "explore-occasions",
  "explore-occasion-slugs",
] as const;

const TARGETS = {
  home: () => {
    revalidateTag("home", "max");
    revalidateTag("kirtan-page", "max");
    revalidatePath("/", "page");
    revalidatePath("/api/home", "page");
    revalidatePath("/sitemap.xml", "page");
  },
  "rare-gems": () => {
    revalidateTag("rare-gems", "max");
    revalidateTag("kirtan-page", "max");
  },
  explore: () => {
    revalidateTag("kirtan-page", "max");
    revalidateTag("explore-bhajans", "max");
    revalidateTag("explore-maha-mantras", "max");
    revalidateTag("explore-leads", "max");
    revalidateTag("explore-leads-slugs", "max");
    revalidateTag("explore-occasions", "max");
    revalidateTag("explore-occasion-slugs", "max");
    const paths = [
      "/explore/bhajans",
      "/api/explore/bhajans",
      "/explore/maha-mantras",
      "/api/explore/maha-mantras",
      "/explore/leads",
      "/api/explore/leads",
      "/explore/occasions",
      "/api/explore/occasions",
    ];

    for (const path of paths) {
      revalidatePath(path, "page");
    }

    revalidatePath("/sitemap.xml", "page");
  },
  all: () => {
    TARGETS.home();
    TARGETS["rare-gems"]();
    TARGETS.explore();
  },
} as const;

type Target = keyof typeof TARGETS;
type CacheTag = (typeof CACHE_TAGS)[number];

function isTarget(value: string): value is Target {
  return value in TARGETS;
}

function isCacheTag(value: string): value is CacheTag {
  return CACHE_TAGS.includes(value as CacheTag);
}

function isAuthorized(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "REVALIDATE_SECRET is not configured" },
        { status: 500 },
      ),
    };
  }

  const provided = req.headers.get(SECRET_HEADER);
  if (provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ target: string }> },
) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { target } = await context.params;
  if (isTarget(target)) {
    TARGETS[target]();

    return NextResponse.json({
      revalidated: true,
      target,
    });
  }

  if (isCacheTag(target)) {
    revalidateTag(target, "max");

    return NextResponse.json({
      revalidated: true,
      target,
      mode: "tag",
    });
  }

  if (!isTarget(target)) {
    return NextResponse.json({ error: "Unknown revalidation target" }, { status: 400 });
  }
}
