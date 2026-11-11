"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import { homeSectionEyebrowClassName } from "@/lib/theme/componentThemes";

export default function UnpublishedKirtansStrip() {
  const player = useAudioPlayer();
  const [passphrase, setPassphrase] = useState("");
  const [requested, setRequested] = useState(false);
  const available = player.unpublishedPreviewAvailable ?? false;
  const unlocked = player.unpublishedPreviewUnlocked ?? false;
  const loading = player.unpublishedPreviewLoading ?? false;
  const error = player.unpublishedPreviewError ?? null;
  const kirtans = player.unpublishedKirtans ?? [];

  useEffect(() => {
    const checkFragment = () => setRequested(window.location.hash === "#unpublished-preview");
    checkFragment();
    window.addEventListener("hashchange", checkFragment);
    return () => window.removeEventListener("hashchange", checkFragment);
  }, []);

  if (!unlocked && (!requested || !available)) return null;

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await player.unlockUnpublishedPreview?.(passphrase);
    if (ok) setPassphrase("");
  }

  return (
    <section aria-label="Unpublished kirtans" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={homeSectionEyebrowClassName}>Unpublished kirtans</h2>
        {unlocked ? (
          <button
            type="button"
            onClick={() => {
              setRequested(false);
              window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
              void player.lockUnpublishedPreview?.();
            }}
            className="text-xs font-medium text-(--theme-page-home-muted) underline underline-offset-4"
          >
            Lock previews
          </button>
        ) : null}
      </div>

      {!unlocked ? (
        <form onSubmit={(event) => void unlock(event)} className="flex gap-2">
          <label className="sr-only" htmlFor="unpublished-preview-passphrase">Preview passphrase</label>
          <input
            id="unpublished-preview-passphrase"
            type="password"
            autoComplete="off"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Preview passphrase"
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl border border-[#e5d8ce] bg-white/85 px-3 py-2 text-sm outline-none focus:border-[#9aaa7c]"
          />
          <button
            type="submit"
            disabled={loading || !passphrase}
            className="rounded-xl bg-[#718c55] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      ) : kirtans.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {kirtans.map((kirtan) => (
            <HomeRailKirtanCard
              key={kirtan.id}
              kirtan={kirtan}
              isActive={player.isActive(kirtan)}
              isPlaying={player.isPlaying(kirtan)}
              isLoading={player.isLoading(kirtan)}
              onActivate={() => player.toggle(kirtan)}
              leadingSlot={<span className="rounded-full border border-[#b7c49f] bg-white/85 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#63794d]">Preview</span>}
              trailingTopSlot={
                <HomeRailActionButtons
                  kirtan={kirtan}
                  isFavorited={player.isFavorited(kirtan.id)}
                  isQueued={player.isQueued(kirtan.id)}
                  onToggleFavorite={player.toggleFavorite}
                  onToggleQueue={(item) => player.isQueued(item.id) ? player.dequeueById(item.id) : player.enqueue(item)}
                />
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--theme-page-home-muted)">No unpublished kirtans with audio are ready to preview.</p>
      )}

      {error ? <p role="status" className="text-xs text-[#a45e5a]">{error}</p> : null}
    </section>
  );
}
