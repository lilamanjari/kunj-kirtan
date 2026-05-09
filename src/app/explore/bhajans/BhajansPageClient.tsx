"use client";

/*
 * Alphabet rail browse model
 * --------------------------
 * The Bhajans page behaves like a hybrid between infinite scroll and an
 * alphabet jump browser:
 *
 * 1. We keep the currently loaded bhajans in a Map keyed by id. That lets us
 *    merge newly fetched slices from above, below, or a jumped-to letter
 *    without duplicating rows.
 * 2. The rendered list is always derived from that Map and sorted by
 *    title/id, so merged slices settle back into one alphabetical list.
 * 3. `loadedWindow` tracks the currently loaded alphabetical range
 *    (start/end cursor plus whether there is more above/below). That range is
 *    updated as we scroll-load upward or downward.
 * 4. Rail taps have two paths:
 *    - if the letter is already loaded, scroll directly to that header
 *    - otherwise fetch a slice starting at that letter, merge it, then scroll
 *      to the newly inserted header
 * 5. Programmatic jumps temporarily block "load earlier" auto-loading until
 *    the target letter has actually reached the top of the viewport. This
 *    prevents cascade-loading while smooth scrolling is still in progress.
 * 6. The rail highlight is driven by the letter header currently nearest the
 *    top of the viewport, so it updates naturally as we scroll up and down.
 * 7. `topPageSnapshot` remembers the canonical first-page window so "back to
 *    top" can restore the same browse state, not just the scroll position.
 *
 * The remaining complexity in this file is mostly orchestration between
 * scrolling, merging, and rail state, so it is intentionally kept page-local.
 */

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import type {
  BhajanAlphabetIndex,
  BhajanCursor,
  BhajansResponse,
} from "@/types/bhajans";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import AlphabetRail from "@/lib/components/AlphabetRail";
import { ALPHABET } from "@/lib/alphabets";

type BhajanItem = KirtanSummary;

type GroupedBhajanRow =
  | { kind: "header"; letter: string }
  | { kind: "item"; bhajan: BhajanItem };

type LoadedBhajanWindow = {
  start: BhajanCursor;
  end: BhajanCursor;
  hasBefore: boolean;
  hasAfter: boolean;
};

type TopPageSnapshot = {
  nextCursor: BhajanCursor | null;
  prevCursor: BhajanCursor | null;
  hasMore: boolean;
  hasBefore: boolean;
  window: LoadedBhajanWindow | null;
};

function getBrowseLetter(title: string) {
  const first = title.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function compareBhajans(a: BhajanItem, b: BhajanItem) {
  return (
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) ||
    a.id.localeCompare(b.id)
  );
}

function toBhajanMap(items: BhajanItem[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function mergeBhajans(prev: Map<string, BhajanItem>, items: BhajanItem[]) {
  const next = new Map(prev);
  for (const item of items) {
    next.set(item.id, item);
  }
  return next;
}

function createLoadedWindow(
  items: BhajanItem[],
  hasBefore: boolean,
  hasAfter: boolean,
): LoadedBhajanWindow | null {
  if (items.length === 0) return null;

  const firstBhajan = items[0];
  const lastBhajan = items[items.length - 1];
  return {
    start: { title: firstBhajan.title, id: firstBhajan.id },
    end: { title: lastBhajan.title, id: lastBhajan.id },
    hasBefore,
    hasAfter,
  };
}

export default function BhajansPageClient({
  initialData,
}: {
  initialData: BhajansResponse;
}) {
  const initialTopPageSnapshot = useMemo<TopPageSnapshot>(
    () => ({
      nextCursor: initialData.next_cursor ?? null,
      prevCursor: initialData.prev_cursor ?? null,
      hasMore: Boolean(initialData.has_more),
      hasBefore: Boolean(initialData.has_before),
      window: createLoadedWindow(
        initialData.bhajans ?? [],
        Boolean(initialData.has_before),
        Boolean(initialData.has_more),
      ),
    }),
    [initialData],
  );
  const [bhajanMap, setBhajanMap] = useState<Map<string, BhajanItem>>(() =>
    toBhajanMap(initialData.bhajans ?? []),
  );
  const [search, setSearch] = useState("");
  const [hasFetchedOnce, setHasFetchedOnce] = useState(
    (initialData.bhajans?.length ?? 0) > 0,
  );
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialData.has_more));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isJumpLoading, setIsJumpLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<BhajanCursor | null>(
    initialData.next_cursor ?? null,
  );
  const [prevCursor, setPrevCursor] = useState<BhajanCursor | null>(
    initialData.prev_cursor ?? null,
  );
  const [hasBefore, setHasBefore] = useState(Boolean(initialData.has_before));
  const [featured, setFeatured] = useState<KirtanSummary | null>(
    initialData.featured ?? null,
  );
  const [alphabetIndex, setAlphabetIndex] = useState<BhajanAlphabetIndex>(
    initialData.alphabet_index ?? {},
  );
  const [pendingLetterScroll, setPendingLetterScroll] = useState<string | null>(
    null,
  );
  const [activeBrowseLetter, setActiveBrowseLetter] = useState<string | null>(
    null,
  );
  // Tracks the current alphabetical window that is loaded in memory. Up/down
  // loaders move this range outward as we merge more rows.
  const [loadedWindow, setLoadedWindow] = useState<LoadedBhajanWindow | null>(
    initialTopPageSnapshot.window,
  );
  // Lets "back to top" restore the first-page browse window instead of only
  // scrolling upward into a stale jumped-to state.
  const [topPageSnapshot, setTopPageSnapshot] = useState<TopPageSnapshot>(
    initialTopPageSnapshot,
  );
  const [loadingBeforeLetter, setLoadingBeforeLetter] = useState<string | null>(
    null,
  );
  const [isRailVisible, setIsRailVisible] = useState(false);
  const hasInitializedSearch = useRef(false);

  const loadMoreRef = useRef<HTMLLIElement | null>(null);
  const loadPreviousRef = useRef<HTMLLIElement | null>(null);
  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const listContentRef = useRef<HTMLUListElement | null>(null);
  const letterRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<"up" | "down" | null>(null);
  const autoLoadBlockedRef = useRef(false);
  const autoLoadResumeLetterRef = useRef<string | null>(null);

  const {
    toggle,
    isActive,
    isPlaying,
    isLoading,
    playCollection,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
    select,
  } = useAudioPlayer();
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);

  function pauseAutoLoadUntilLetter(letter: string | null) {
    autoLoadBlockedRef.current = Boolean(letter);
    autoLoadResumeLetterRef.current = letter;
  }

  function resumeAutoLoad() {
    autoLoadBlockedRef.current = false;
    autoLoadResumeLetterRef.current = null;
  }

  function resetPagination() {
    setBhajanMap(new Map());
    setNextCursor(null);
    setPrevCursor(null);
    setHasMore(true);
    setHasBefore(false);
    setPendingLetterScroll(null);
    setActiveBrowseLetter(null);
    setLoadedWindow(null);
    resumeAutoLoad();
  }

  const loadPreviousPage = useCallback(async () => {
    if (!loadedWindow || !hasBefore || isLoadingPrevious || !prevCursor) return;

    // Render the loading marker just above the current window start so the
    // newly fetched titles appear to populate upward into that gap.
    setLoadingBeforeLetter(getBrowseLetter(loadedWindow.start.title));
    setIsLoadingPrevious(true);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "20");
    params.set("before_title", prevCursor.title);
    params.set("before_id", prevCursor.id);

    try {
      const res = await fetchWithStatus(
        `/api/explore/bhajans?${params.toString()}`,
      );
      const data = (await res.json()) as BhajansResponse;
      setBhajanMap((prev) => mergeBhajans(prev, data.bhajans ?? []));
      setHasBefore(Boolean(data.has_before));
      setPrevCursor(data.prev_cursor ?? null);

      if (data.bhajans?.length) {
        const firstBhajan = data.bhajans[0];
        setLoadedWindow((prev) =>
          prev
            ? {
                ...prev,
                start: { title: firstBhajan.title, id: firstBhajan.id },
                hasBefore: Boolean(data.has_before),
              }
            : prev,
        );
      }
    } finally {
      setIsLoadingPrevious(false);
      setLoadingBeforeLetter(null);
    }
  }, [hasBefore, isLoadingPrevious, loadedWindow, prevCursor, search]);

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "20");
    const url = `/api/explore/bhajans?${params.toString()}`;
    fetchWithStatus(url)
      .then((res) => res.json())
      .then((data: BhajansResponse) => {
        const nextTopPageSnapshot = {
          nextCursor: data.next_cursor ?? null,
          prevCursor: data.prev_cursor ?? null,
          hasMore: Boolean(data.has_more),
          hasBefore: Boolean(data.has_before),
          window: createLoadedWindow(
            data.bhajans ?? [],
            Boolean(data.has_before),
            Boolean(data.has_more),
          ),
        } satisfies TopPageSnapshot;
        setBhajanMap(toBhajanMap(data.bhajans ?? []));
        setHasBefore(Boolean(data.has_before));
        setHasMore(Boolean(data.has_more));
        setPrevCursor(data.prev_cursor ?? null);
        setNextCursor(data.next_cursor ?? null);
        setHasFetchedOnce(true);
        setFeatured(data.featured ?? null);
        setAlphabetIndex(data.alphabet_index ?? {});
        setLoadedWindow(nextTopPageSnapshot.window);
        setTopPageSnapshot(nextTopPageSnapshot);
        // Search results define a fresh browse universe, so we reset the
        // top-page snapshot to that new first page as well.
      })
      .finally(() => setIsLoadingList(false));
  }, [search]);

  const syncVisibleLetter = useCallback(() => {
    // The rail highlight follows the letter header nearest the top of the
    // viewport, rather than staying stuck on the last clicked letter.
    const visibleEntries = Object.entries(letterRefs.current).filter(
      ([, node]) => node,
    );
    if (visibleEntries.length === 0) return;

    const viewportHeight = window.innerHeight;
    const currentVisible =
      visibleEntries
        .map(([letter, node]) => ({
          letter,
          top: node!.getBoundingClientRect().top,
        }))
        .filter(({ top }) => top <= viewportHeight * 0.35)
        .sort((a, b) => b.top - a.top)[0] ??
      visibleEntries
        .map(([letter, node]) => ({
          letter,
          top: Math.abs(node!.getBoundingClientRect().top),
        }))
        .sort((a, b) => a.top - b.top)[0];

    if (
      currentVisible?.letter &&
      currentVisible.letter !== activeBrowseLetter
    ) {
      setActiveBrowseLetter(currentVisible.letter);
    }

    const resumeLetter = autoLoadResumeLetterRef.current;
    if (!resumeLetter) return;

    const resumeNode = letterRefs.current[resumeLetter];
    if (!resumeNode) return;

    // Programmatic rail jumps re-enable upward auto-load only after the target
    // letter has actually arrived near the top. This prevents jump-triggered
    // cascade loads from pulling the viewport away from the chosen letter.
    const top = resumeNode.getBoundingClientRect().top;
    if (top >= -24 && top <= 64) {
      resumeAutoLoad();
    }
  }, [activeBrowseLetter]);

  useEffect(() => {
    const updateRailVisibility = () => {
      const node = listSectionRef.current;
      if (!node) {
        setIsRailVisible(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const topThreshold = 140;
      const bottomThreshold = 180;
      setIsRailVisible(
        rect.top <= topThreshold && rect.bottom > bottomThreshold,
      );
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const viewportHeight = window.innerHeight;
      if (currentY > lastScrollYRef.current) {
        scrollDirectionRef.current = "down";
      } else if (currentY < lastScrollYRef.current) {
        scrollDirectionRef.current = "up";
      }
      lastScrollYRef.current = currentY;
      updateRailVisibility();
      syncVisibleLetter();

      // Upward loading is scroll-driven rather than observer-driven so we can
      // require a real upward motion before fetching more letters above.
      if (
        !autoLoadBlockedRef.current &&
        scrollDirectionRef.current === "up" &&
        hasBefore &&
        !isLoadingPrevious &&
        loadPreviousRef.current
      ) {
        const rect = loadPreviousRef.current.getBoundingClientRect();
        if (rect.top < viewportHeight * 0.33 && rect.bottom > 0) {
          void loadPreviousPage();
        }
      }
    };

    lastScrollYRef.current = window.scrollY;
    updateRailVisibility();
    syncVisibleLetter();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateRailVisibility);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateRailVisibility);
    };
  }, [hasBefore, isLoadingPrevious, loadPreviousPage, syncVisibleLetter]);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (scrollDirectionRef.current === "up") return;
        if (!nextCursor) return;

        // Downward infinite scroll keeps the same merged-list model as the
        // alphabet jump browser: fetch a slice, merge it, extend the window.
        setIsLoadingMore(true);

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", "20");
        params.set("cursor_title", nextCursor.title);
        params.set("cursor_id", nextCursor.id);

        fetchWithStatus(`/api/explore/bhajans?${params.toString()}`)
          .then((res) => res.json())
          .then((data: BhajansResponse) => {
            setBhajanMap((prev) => mergeBhajans(prev, data.bhajans ?? []));
            setHasMore(Boolean(data.has_more));
            setNextCursor(data.next_cursor ?? null);
            if (loadedWindow && data.bhajans?.length) {
              const lastBhajan = data.bhajans[data.bhajans.length - 1];
              setLoadedWindow((prev) =>
                prev
                  ? {
                      ...prev,
                      end: { title: lastBhajan.title, id: lastBhajan.id },
                      hasAfter: Boolean(data.has_more),
                    }
                  : prev,
              );
            }
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadedWindow, nextCursor, search]);

  const sortedBhajans = useMemo(() => {
    return Array.from(bhajanMap.values()).sort(compareBhajans);
  }, [bhajanMap]);

  const renderedBhajans = useMemo(() => {
    return pinnedKirtan
      ? [pinnedKirtan, ...sortedBhajans.filter((k) => k.id !== pinnedKirtan.id)]
      : sortedBhajans;
  }, [pinnedKirtan, sortedBhajans]);

  const availableLetters = useMemo(() => {
    return new Set(Object.keys(alphabetIndex));
  }, [alphabetIndex]);

  const groupedBhajans = useMemo(() => {
    const rows: GroupedBhajanRow[] = [];
    let currentLetter: string | null = null;

    for (const bhajan of renderedBhajans) {
      const letter = getBrowseLetter(bhajan.title);
      if (letter !== currentLetter) {
        currentLetter = letter;
        rows.push({ kind: "header", letter });
      }
      rows.push({ kind: "item", bhajan });
    }

    return rows;
  }, [renderedBhajans]);

  useEffect(() => {
    syncVisibleLetter();
  }, [groupedBhajans, syncVisibleLetter]);

  const loadedWindowStartLetter = useMemo(() => {
    return loadedWindow ? getBrowseLetter(loadedWindow.start.title) : null;
  }, [loadedWindow]);

  const loadPreviousAnchorLetter = isLoadingPrevious
    ? loadingBeforeLetter
    : loadedWindowStartLetter;

  useEffect(() => {
    if (!pendingLetterScroll) return;
    const node = letterRefs.current[pendingLetterScroll];
    if (!node) return;

    requestAnimationFrame(() => {
      // We block upward auto-load while the smooth scroll is traveling to the
      // target letter, otherwise the temporary upward motion can trigger
      // cascading loads from letters above.
      pauseAutoLoadUntilLetter(pendingLetterScroll);
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingLetterScroll(null);
    });
  }, [groupedBhajans, pendingLetterScroll]);

  function jumpToLoadedLetter(letter: string) {
    const node = letterRefs.current[letter];
    if (!node) return false;
    setActiveBrowseLetter(letter);
    // Loaded-letter jumps are still programmatic scrolls, so they also need
    // the same auto-load pause as freshly fetched jumps.
    pauseAutoLoadUntilLetter(letter);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  async function resetToStart() {
    setActiveBrowseLetter(loadedWindowStartLetter ?? null);
    setLoadedWindow(topPageSnapshot.window);
    setHasBefore(topPageSnapshot.hasBefore);
    setHasMore(topPageSnapshot.hasMore);
    setPrevCursor(topPageSnapshot.prevCursor);
    setNextCursor(topPageSnapshot.nextCursor);
    resumeAutoLoad();
    // Returning to the top should feel like restoring the first browse window,
    // not like a reload from scratch.
    listSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function jumpToLetter(letter: string) {
    if (jumpToLoadedLetter(letter)) {
      return;
    }

    const startCursor = alphabetIndex[letter];
    if (!startCursor || isJumpLoading) {
      return;
    }

    setIsJumpLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "20");
    params.set("start_title", startCursor.title);
    params.set("start_id", startCursor.id);

    try {
      const res = await fetchWithStatus(
        `/api/explore/bhajans?${params.toString()}`,
      );
      const data = (await res.json()) as BhajansResponse;
      const items = data.bhajans ?? [];
      // Jump loads merge into the same canonical map, then narrow the active
      // window to the fetched slice so subsequent up/down loading grows from
      // that letter naturally.
      setBhajanMap((prev) => mergeBhajans(prev, items));
      setHasBefore(Boolean(data.has_before));
      setHasMore(Boolean(data.has_more));
      setPrevCursor(data.prev_cursor ?? null);
      setNextCursor(data.next_cursor ?? null);
      setHasFetchedOnce(true);
      setPendingLetterScroll(letter);
      setActiveBrowseLetter(letter);
      setLoadedWindow(
        createLoadedWindow(
          items,
          Boolean(data.has_before),
          Boolean(data.has_more),
        ),
      );
    } finally {
      setIsJumpLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={sortedBhajans}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <SubpageHeader title="Bhajans" backLabel="Home" backHref="/" />

        {featured ? (
          <div className="-mt-10">
            <FeaturedKirtanCard
              kirtan={featured}
              isActive={isActive(featured)}
              isPlaying={isPlaying()}
              isLoading={isLoading()}
              onToggle={() => toggle(featured)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featured.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(featured.id)}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search bhajans…"
            value={search}
            onChange={(e) => {
              setIsLoadingList(true);
              resetPagination();
              setSearch(e.target.value);
            }}
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
          />

          {sortedBhajans.length > 1 ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => playCollection(renderedBhajans)}
                aria-label="Play all bhajans"
                title="Play all"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
              >
                <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  playCollection(renderedBhajans, { shuffle: true })
                }
                aria-label="Shuffle bhajans"
                title="Shuffle"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
              >
                <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div ref={listSectionRef} className="relative">
          {availableLetters.size > 0 ? (
            <AlphabetRail
              letters={ALPHABET}
              availableLetters={availableLetters}
              onSelectLetter={jumpToLetter}
              currentLetter={activeBrowseLetter}
              onReset={activeBrowseLetter ? resetToStart : null}
              visible={isRailVisible}
            />
          ) : null}

          <div className="flex items-start gap-3">
            <ul ref={listContentRef} className="min-w-0 flex-1 space-y-3">
              {isLoadingList ? (
                <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`bhj-loading-${idx}`}
                        className="h-12 rounded-lg bg-stone-100 animate-pulse"
                      />
                    ))}
                  </div>
                </li>
              ) : renderedBhajans.length === 0 && hasFetchedOnce ? (
                <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
                  No Bhajans match your search.
                </li>
              ) : (
                groupedBhajans.map((row) =>
                  row.kind === "header" ? (
                    <Fragment key={`letter-${row.letter}`}>
                      {row.letter === loadPreviousAnchorLetter &&
                      ((isLoadingPrevious && loadingBeforeLetter) ||
                        (loadedWindow?.hasBefore ?? false)) ? (
                        <li
                          ref={loadPreviousRef}
                          className={
                            isLoadingPrevious
                              ? "mb-3 rounded-xl border border-dashed border-stone-200 bg-white/75 px-3 py-2 text-center text-[0.68rem] uppercase tracking-[0.18em] text-stone-400"
                              : "mb-3 h-px overflow-hidden opacity-0"
                          }
                          aria-hidden={!isLoadingPrevious}
                        >
                          {isLoadingPrevious && loadingBeforeLetter
                            ? `Loading titles before ${loadingBeforeLetter}…`
                            : "Loading more…"}
                        </li>
                      ) : null}
                      <li
                        ref={(node) => {
                          letterRefs.current[row.letter] = node;
                        }}
                        className="pt-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#9b6a5f]"
                      >
                        {row.letter}
                      </li>
                    </Fragment>
                  ) : (
                    <Fragment key={row.bhajan.id}>
                      <KirtanListItem
                        kirtan={row.bhajan}
                        isActive={isActive(row.bhajan)}
                        isPlaying={isPlaying()}
                        isLoading={isLoading()}
                        onToggle={() => toggle(row.bhajan)}
                        onEnqueue={enqueue}
                        onDequeue={dequeueById}
                        isQueued={isQueued(row.bhajan.id)}
                        onToggleFavorite={toggleFavorite}
                        isFavorited={isFavorited(row.bhajan.id)}
                      />
                      {loadedWindow && row.bhajan.id === loadedWindow.end.id ? (
                        <li
                          ref={loadMoreRef}
                          className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white/75 px-3 py-2 text-center text-[0.68rem] uppercase tracking-[0.18em] text-stone-400"
                        >
                          {isLoadingMore
                            ? "Loading more…"
                            : loadedWindow.hasAfter
                              ? "More below"
                              : ""}
                        </li>
                      ) : null}
                    </Fragment>
                  ),
                )
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
