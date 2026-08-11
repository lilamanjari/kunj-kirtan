"use client";

type OfflineDownloadBadgeProps = {
  downloaded: boolean;
  downloading?: boolean;
  className?: string;
};

export default function OfflineDownloadBadge({
  downloaded,
  downloading = false,
  className = "",
}: OfflineDownloadBadgeProps) {
  if (!downloaded && !downloading) return null;

  if (downloading) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-[rgba(113,151,82,0.35)] bg-white/88 ${className}`}
      >
        <span className="block h-2 w-2 animate-spin rounded-full border border-[rgba(113,151,82,0.35)] border-t-[#6f9752]" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#6f9752] text-[10px] font-bold leading-none text-white ${className}`}
    >
      ↓
    </span>
  );
}
