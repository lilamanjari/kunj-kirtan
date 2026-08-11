export type OfflineDownloadedItem = {
  kirtanId: string;
  audioUrl: string;
  imageUrl: string | null;
  sizeBytes: number;
  cachedAt: number;
};

export type OfflineFavoritesState = {
  enabled: boolean;
  selectedIds: string[];
  downloadedById: Record<string, OfflineDownloadedItem>;
};

export type OfflinePlayLog = {
  id: string;
  kirtan_id: string;
  seconds_played: number;
  session_id: string | null;
  client_id: string | null;
  played_at: string;
};
