function getImageDeliveryMode() {
  return process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE === "manual"
    ? "manual"
    : "cloudflare";
}

function trimBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function getCloudflareImageBaseUrl() {
  return trimBaseUrl(
    process.env.NEXT_PUBLIC_R2_IMAGES_BASE_URL ??
      process.env.R2_IMAGES_BASE_URL ??
      "",
  );
}

function getManualOriginalImageBaseUrl() {
  return trimBaseUrl(
    process.env.NEXT_PUBLIC_R2_ORIGINAL_IMAGES_BASE_URL ??
      process.env.R2_ORIGINAL_IMAGES_BASE_URL ??
      process.env.NEXT_PUBLIC_R2_DERIVED_IMAGES_BASE_URL ??
      process.env.R2_DERIVED_IMAGES_BASE_URL ??
      getCloudflareImageBaseUrl(),
  );
}

function getManualDerivedImageBaseUrl() {
  return trimBaseUrl(
    process.env.NEXT_PUBLIC_R2_DERIVED_IMAGES_BASE_URL ??
      process.env.R2_DERIVED_IMAGES_BASE_URL ??
      process.env.NEXT_PUBLIC_R2_ORIGINAL_IMAGES_BASE_URL ??
      process.env.R2_ORIGINAL_IMAGES_BASE_URL ??
      getCloudflareImageBaseUrl(),
  );
}

function encodeImageKey(imageKey: string) {
  return imageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildBucketImageUrl(imageKey: string | null | undefined) {
  const trimmedKey = imageKey?.trim().replace(/^\/+/, "");
  const trimmedBaseUrl =
    getImageDeliveryMode() === "manual"
      ? getManualOriginalImageBaseUrl()
      : getCloudflareImageBaseUrl();

  if (!trimmedKey || !trimmedBaseUrl) {
    return null;
  }

  return `${trimmedBaseUrl}/${encodeImageKey(trimmedKey)}`;
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

  if (getImageDeliveryMode() === "manual") {
    const width = options.width;
    const height = options.height;

    if (!width || !height) {
      return url.toString();
    }

    const pathnameParts = url.pathname
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean);

    if (pathnameParts.length < 2) {
      return url.toString();
    }

    const [topLevelFolder, ...rest] = pathnameParts;
    const extensionIndex = rest.at(-1)?.lastIndexOf(".") ?? -1;

    if (extensionIndex <= 0) {
      return url.toString();
    }

    const fileName = rest.at(-1) ?? "";
    const extension = fileName.slice(extensionIndex);
    const fileStem = fileName.slice(0, extensionIndex);
    const nestedParts = rest.slice(0, -1);
    const flattenedStem = [...nestedParts, fileStem].join("__");
    const version =
      process.env.NEXT_PUBLIC_IMAGE_DERIVATIVE_VERSION ??
      process.env.IMAGE_DERIVATIVE_VERSION ??
      "1";
    const derivedBaseUrl = getManualDerivedImageBaseUrl();

    if (!derivedBaseUrl) {
      return url.toString();
    }

    return `${derivedBaseUrl}/${encodeImageKey(`${topLevelFolder}/derived/${flattenedStem}__${width}x${height}_v${version}${extension}`)}`;
  }

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

export function appendImageVersion(
  imageUrl: string | null | undefined,
  version: string | number | null | undefined,
) {
  if (!imageUrl || version === null || version === undefined || version === "") {
    return imageUrl ?? null;
  }

  const url = new URL(imageUrl);
  url.searchParams.set("v", String(version));
  return url.toString();
}
