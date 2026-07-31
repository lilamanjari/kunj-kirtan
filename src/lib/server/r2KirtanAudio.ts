import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { KirtanType } from "@/types/kirtan";
import { getAudioFileExtension } from "@/lib/admin/audioUpload";

const MEDIA_BASE_URL =
  process.env.MEDIA_BASE_URL || "https://media.kunjkirtan.com";
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || "kirtans";

function getR2Client() {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2 credentials in environment.");
  }

  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

function contentTypeForExt(ext: string) {
  switch (ext) {
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "wav":
      return "audio/wav";
    case "flac":
      return "audio/flac";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "mp3":
    default:
      return "audio/mpeg";
  }
}

export function getStorageKeyFromAudioUrl(audioUrl: string) {
  const url = new URL(audioUrl);
  return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
}

export function buildReplacementAudioStorageKey(params: {
  currentAudioUrl: string;
  kirtanId: string;
  fileName: string;
}) {
  const currentKey = getStorageKeyFromAudioUrl(params.currentAudioUrl);
  const currentSegments = currentKey.split("/");
  currentSegments.pop();
  const currentFolder = currentSegments.join("/");
  const extension = getAudioFileExtension(params.fileName) || "mp3";
  const suffix = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "-");

  return `${currentFolder}/${params.kirtanId}-admin-${suffix}.${extension}`;
}

export function resolveKirtanStorageFolder(type: KirtanType) {
  switch (type) {
    case "MM":
      return "mm";
    case "HK":
      return "hk";
    case "BHJ":
    default:
      return "bhajans";
  }
}

export function buildInitialAudioStorageKey(params: {
  type: KirtanType;
  kirtanId: string;
  fileName: string;
}) {
  const extension = getAudioFileExtension(params.fileName) || "mp3";
  return `${resolveKirtanStorageFolder(params.type)}/${params.kirtanId}.${extension}`;
}

export function getAudioPublicUrl(storageKey: string) {
  return `${MEDIA_BASE_URL.replace(/\/$/, "")}/${storageKey}`;
}

export async function uploadAudioToR2(params: {
  storageKey: string;
  body: Uint8Array;
  fileName: string;
  contentType?: string | null;
}) {
  const client = getR2Client();
  const extension = getAudioFileExtension(params.fileName) || "mp3";

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: params.storageKey,
      Body: params.body,
      ContentType:
        params.contentType && params.contentType.trim().length > 0
          ? params.contentType
          : contentTypeForExt(extension),
    }),
  );
}

export async function deleteAudioFromR2(storageKey: string) {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
    }),
  );
}
