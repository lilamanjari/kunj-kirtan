const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ADMIN_LEAD_SINGER_IMAGE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif";

export function getLeadSingerImageFileExtension(filename: string) {
  const match = String(filename).match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedAdminLeadSingerImageFile(file: {
  name: string;
  type?: string | null;
}) {
  const extension = getLeadSingerImageFileExtension(file.name);
  const normalizedType = String(file.type ?? "").toLowerCase();

  if (ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return true;
  }

  return ALLOWED_IMAGE_MIME_TYPES.has(normalizedType);
}
