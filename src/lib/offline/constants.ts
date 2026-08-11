export const OFFLINE_FAVORITES_STORAGE_KEY = "kirtan_offline_favorites_v1";
export const OFFLINE_PLAY_LOGS_STORAGE_KEY = "kirtan_offline_play_logs_v1";

export const OFFLINE_SHELL_CACHE = "kirtan-oasis-shell-v1";
export const OFFLINE_MEDIA_CACHE = "kirtan-oasis-media-v1";

export const MAX_OFFLINE_FAVORITES = 50;
export const MAX_OFFLINE_AUDIO_BYTES = 1024 * 1024 * 1024 * 2;

export function buildOfflineAudioCacheUrl(kirtanId: string) {
  return `/__offline/audio/${encodeURIComponent(kirtanId)}`;
}

export function buildOfflineShellUrls(locale: string) {
  return [`/${locale}`, `/${locale}/favorites`];
}
