// Cloudflare Worker for resizing and optimizing app images at the edge.
// It serves transformed images from a dedicated route while fetching originals from a separate public origin.

type Env = {
  ORIGINAL_IMAGES_BASE_URL: string;
};

const DEFAULT_WIDTH = 320;
const DEFAULT_QUALITY = 82;
const MAX_DIMENSION = 1600;
const MAX_QUALITY = 95;
// Intentionally short during the redesign phase so image/art swaps and 404
// fixes do not stay sticky in caches for days. Revisit once the design is
// stable and asset URLs are treated as immutable.
const DESIGN_PHASE_EDGE_TTL_SECONDS = 60 * 60;
const DESIGN_PHASE_BROWSER_TTL_SECONDS = 60 * 60;
const ALLOWED_FITS = new Set(["scale-down", "contain", "cover", "crop", "pad"]);
const ALLOWED_FORMATS = new Set(["auto", "webp", "avif", "jpeg", "png"]);

function clampInteger(
  value: string | null,
  minimum: number,
  maximum: number,
  fallback?: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function normalizeKey(pathname: string) {
  const trimmed = pathname.replace(/^\/+/, "");
  if (!trimmed) {
    return null;
  }

  const parts = trimmed
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join("/");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

const imageResizerWorker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const key = normalizeKey(url.pathname);

    if (!env.ORIGINAL_IMAGES_BASE_URL?.trim()) {
      return json(
        { error: "ORIGINAL_IMAGES_BASE_URL is not configured." },
        500,
      );
    }

    if (!key) {
      return json(
        {
          error: "Missing image key.",
          example: "/lead-singers/bb-rasikananda-maharaja.jpg?w=320",
        },
        400,
      );
    }

    const width = clampInteger(
      url.searchParams.get("w") ?? url.searchParams.get("width"),
      16,
      MAX_DIMENSION,
      DEFAULT_WIDTH,
    );
    const height = clampInteger(
      url.searchParams.get("h") ?? url.searchParams.get("height"),
      16,
      MAX_DIMENSION,
    );
    const quality = clampInteger(
      url.searchParams.get("q") ?? url.searchParams.get("quality"),
      30,
      MAX_QUALITY,
      DEFAULT_QUALITY,
    );

    const requestedFit = url.searchParams.get("fit") ?? "scale-down";
    const fit = ALLOWED_FITS.has(requestedFit) ? requestedFit : "scale-down";

    const requestedFormat = url.searchParams.get("format") ?? "auto";
    const format = ALLOWED_FORMATS.has(requestedFormat)
      ? requestedFormat
      : "auto";

    const sourceUrl = new URL(
      key,
      env.ORIGINAL_IMAGES_BASE_URL.endsWith("/")
        ? env.ORIGINAL_IMAGES_BASE_URL
        : `${env.ORIGINAL_IMAGES_BASE_URL}/`,
    );

    const response = await fetch(sourceUrl.toString(), {
      cf: {
        cacheTtl: DESIGN_PHASE_EDGE_TTL_SECONDS,
        cacheEverything: true,
        image: {
          fit,
          width,
          height,
          quality,
          format,
          metadata: "none",
        },
      },
    });

    if (!response.ok) {
      return json(
        {
          error: "Failed to fetch original image.",
          status: response.status,
          key,
        },
        response.status,
      );
    }

    const headers = new Headers(response.headers);
    headers.set(
      "cache-control",
      `public, max-age=${DESIGN_PHASE_BROWSER_TTL_SECONDS}, stale-while-revalidate=86400`,
    );
    headers.set("x-image-key", key);
    headers.set("x-image-width", String(width));
    headers.set("x-image-fit", fit);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};

export default imageResizerWorker;
