import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getLeadSingerImageFileExtension } from "@/lib/admin/leadSingerImageUpload";

const R2_IMAGES_ENDPOINT = process.env.R2_IMAGES_ENDPOINT || process.env.R2_ENDPOINT;
const R2_IMAGES_ACCESS_KEY_ID =
  process.env.R2_IMAGES_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_IMAGES_SECRET_ACCESS_KEY =
  process.env.R2_IMAGES_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const R2_IMAGES_BUCKET =
  process.env.R2_IMAGES_BUCKET ||
  process.env.R2_BUCKET_IMAGES ||
  "images";

function getR2ImagesClient() {
  if (
    !R2_IMAGES_ENDPOINT ||
    !R2_IMAGES_ACCESS_KEY_ID ||
    !R2_IMAGES_SECRET_ACCESS_KEY
  ) {
    throw new Error("Missing R2 image credentials in environment.");
  }

  return new S3Client({
    region: "auto",
    endpoint: R2_IMAGES_ENDPOINT,
    credentials: {
      accessKeyId: R2_IMAGES_ACCESS_KEY_ID,
      secretAccessKey: R2_IMAGES_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

function contentTypeForImageExt(ext: string) {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

function slugifyLeadSingerFileStem(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "lead-singer";
}

export function buildLeadSingerImageStorageKey(params: {
  displayName: string;
  fileName: string;
}) {
  const extension = getLeadSingerImageFileExtension(params.fileName) || "jpg";
  return `lead-singers/${slugifyLeadSingerFileStem(params.displayName)}.${extension}`;
}

export async function uploadLeadSingerImageToR2(params: {
  storageKey: string;
  body: Uint8Array;
  fileName: string;
  contentType?: string | null;
}) {
  const client = getR2ImagesClient();
  const extension = getLeadSingerImageFileExtension(params.fileName) || "jpg";

  await client.send(
    new PutObjectCommand({
      Bucket: R2_IMAGES_BUCKET,
      Key: params.storageKey,
      Body: params.body,
      ContentType:
        params.contentType && params.contentType.trim().length > 0
          ? params.contentType
          : contentTypeForImageExt(extension),
    }),
  );
}

export async function deleteLeadSingerImageFromR2(storageKey: string) {
  const client = getR2ImagesClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_IMAGES_BUCKET,
      Key: storageKey,
    }),
  );
}
