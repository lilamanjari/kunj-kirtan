const ALLOWED_AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "aac",
  "wav",
  "flac",
  "ogg",
  "oga",
]);

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "application/ogg",
]);

export const MAX_ADMIN_AUDIO_UPLOAD_BYTES = 300 * 1024 * 1024;
export const ADMIN_AUDIO_ACCEPT =
  ".mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/ogg";

export function getAudioFileExtension(filename: string) {
  const match = String(filename).match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedAdminAudioFile(file: {
  name: string;
  type?: string | null;
}) {
  const extension = getAudioFileExtension(file.name);
  const normalizedType = String(file.type ?? "").toLowerCase();

  if (ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return true;
  }

  return ALLOWED_AUDIO_MIME_TYPES.has(normalizedType);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}
