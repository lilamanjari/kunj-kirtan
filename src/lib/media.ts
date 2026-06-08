export function buildBucketImageUrl(imageKey: string | null | undefined) {
  const baseUrl =
    process.env.NEXT_PUBLIC_R2_IMAGES_BASE_URL ??
    process.env.R2_IMAGES_BASE_URL ??
    "";

  const trimmedKey = imageKey?.trim().replace(/^\/+/, "");
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (!trimmedKey || !trimmedBaseUrl) {
    return null;
  }

  const encodedPath = trimmedKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${trimmedBaseUrl}/${encodedPath}`;
}

type ImageTransformOptions = {
  width?: number;
  height?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  quality?: number;
  format?: "auto" | "webp" | "avif" | "jpeg" | "png";
};

export function buildTransformedImageUrl(
  imageUrl: string | null | undefined,
  options: ImageTransformOptions,
) {
  if (!imageUrl) {
    return null;
  }

  const url = new URL(imageUrl);

  if (options.width) {
    url.searchParams.set("w", String(options.width));
  }
  if (options.height) {
    url.searchParams.set("h", String(options.height));
  }
  if (options.fit) {
    url.searchParams.set("fit", options.fit);
  }
  if (options.quality) {
    url.searchParams.set("q", String(options.quality));
  }
  if (options.format) {
    url.searchParams.set("format", options.format);
  }

  return url.toString();
}
