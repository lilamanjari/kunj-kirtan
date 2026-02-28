const MEDIA_BASE =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "https://media.kunjkirtan.com";

export function toProxyAudioUrl(audioUrl?: string | null): string {
  if (!audioUrl) return "";
  const marker = "/storage/v1/object/public/kirtans/";
  const idx = audioUrl.indexOf(marker);
  if (idx === -1) return audioUrl;
  const path = audioUrl.slice(idx + marker.length);
  if (!path) return audioUrl;
  return `${MEDIA_BASE}/${path}`;
}
