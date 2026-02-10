import Equalizer from "@/lib/components/Equalizer";
import { KirtanSummary } from "@/types/kirtan";

type RecentlyAddedItemProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "";
  }

  const total = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function RecentlyAddedItem({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
}: RecentlyAddedItemProps) {
  const durationLabel = formatDuration(kirtan.duration_seconds);

  return (
    <li
      onClick={onToggle}
      className={`
        flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 shadow-sm transition
        ${
          isActive
            ? "bg-gradient-to-r from-green-50 to-green-100"
            : "bg-white hover:bg-stone-50"
        }
        ${isActive && isPlaying ? "animate-breathe" : ""}
        ${isActive && !isPlaying ? "opacity-90" : ""}
      `}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {kirtan.title ?? "Maha Mantra"}
        </p>
        <p className="truncate text-xs text-stone-500">
          {kirtan.lead_singer}{" "}
          {kirtan.sanga ? `in ${kirtan.sanga}` : "Unknown location"}
        </p>
        <p className="truncate text-xs text-stone-500">
          {formatDate(kirtan.recorded_date)}
          {durationLabel ? ` • ${durationLabel}` : ""}
        </p>
      </div>

      <div className="ml-4 flex h-6 w-6 items-center justify-center">
        {isActive && isPlaying ? (
          <Equalizer />
        ) : (
          <span
            className={`text-sm transition ${
              isActive ? "text-green-700" : "text-stone-600"
            }`}
          >
            ▶
          </span>
        )}
      </div>
    </li>
  );
}
