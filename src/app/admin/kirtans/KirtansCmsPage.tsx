"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import type {
  AdminKirtanDetail,
  AdminKirtanListItem,
  AdminTagSummary,
} from "@/lib/admin/types";

type StatusFilter = "all" | "published" | "hidden";
type TypeFilter = "all" | "MM" | "BHJ" | "HK";
type SaveState = "idle" | "saving" | "saved" | "error";

type KirtanTitleDrafts = Partial<Record<"first_line" | "official", string>>;

function sectionCardClassName(extra = "") {
  return `rounded-[var(--theme-radius-surface)] border border-[#edd8ce] bg-[rgba(255,250,246,0.92)] shadow-[0_20px_44px_rgba(170,118,91,0.12)] ${extra}`.trim();
}

function fieldClassName() {
  return "w-full rounded-[var(--theme-radius-card)] border border-[#e8d4cb] bg-white/90 px-3 py-2 text-sm text-[#5d433c] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)]";
}

function badgeClassName(active: boolean) {
  return active
    ? "rounded-full bg-[color:var(--theme-player-green-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--theme-player-green)]"
    : "rounded-full bg-[#f5e5de] px-2.5 py-1 text-xs font-semibold text-[#af6f6a]";
}

function formatMetaLine(kirtan: AdminKirtanListItem | AdminKirtanDetail) {
  const parts = [kirtan.type, kirtan.lead_singer, kirtan.recorded_date].filter(Boolean);
  return parts.join(" • ");
}

function formatDuration(durationSeconds: number | null | undefined) {
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getSequenceLabel(kirtan: Pick<AdminKirtanListItem, "type" | "sequence_num"> | Pick<AdminKirtanDetail, "type" | "sequence_num">) {
  if (kirtan.type !== "MM" || !kirtan.sequence_num) {
    return null;
  }

  return `Maha Mantra #${kirtan.sequence_num}`;
}

export function KirtansCmsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const deferredSearch = useDeferredValue(search);
  const [kirtans, setKirtans] = useState<AdminKirtanListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminKirtanDetail | null>(null);
  const [tagSearch, setTagSearch] = useState("");
  const deferredTagSearch = useDeferredValue(tagSearch);
  const [availableTags, setAvailableTags] = useState<AdminTagSummary[]>([]);
  const [titleDrafts, setTitleDrafts] = useState<KirtanTitleDrafts>({});
  const [titleSaveState, setTitleSaveState] = useState<Record<string, SaveState>>({});
  const [publishingState, setPublishingState] = useState<SaveState>("idle");
  const [tagState, setTagState] = useState<SaveState>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusLabel = hasActiveFilters
    ? `${filteredCount}/${totalCount}`
    : `${totalCount}`;

  useEffect(() => {
    let cancelled = false;

    async function loadKirtans() {
      setListError(null);
      const params = new URLSearchParams();
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);

      const response = await fetch(`/api/admin/kirtans?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setListError(json.error ?? "Failed to load kirtans");
        return;
      }

      const nextKirtans = (json.kirtans ?? []) as AdminKirtanListItem[];
      setKirtans(nextKirtans);
      setTotalCount(Number(json.totalCount ?? nextKirtans.length));
      setFilteredCount(Number(json.filteredCount ?? nextKirtans.length));
      setHasActiveFilters(Boolean(json.hasActiveFilters));
      setSelectedId((current) => {
        if (current && nextKirtans.some((item) => item.id === current)) {
          return current;
        }
        return nextKirtans[0]?.id ?? null;
      });
    }

    loadKirtans().catch((loadError) => {
      if (!cancelled) {
        setListError(loadError instanceof Error ? loadError.message : "Failed to load kirtans");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, status, type]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let cancelled = false;

    async function loadKirtan() {
      const response = await fetch(`/api/admin/kirtans/${selectedId}`, {
        cache: "no-store",
      });
      const json = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setDetailError(json.error ?? "Failed to load kirtan");
        return;
      }

      const detail = json.kirtan as AdminKirtanDetail;
      setSelected(detail);
      setTitleDrafts({
        first_line: detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
        official: detail.titles.find((row) => row.kind === "official")?.title ?? "",
      });
    }

    loadKirtan().catch((loadError) => {
      if (!cancelled) {
        setDetailError(loadError instanceof Error ? loadError.message : "Failed to load kirtan");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      const params = new URLSearchParams();
      if (deferredTagSearch.trim()) params.set("search", deferredTagSearch.trim());
      params.set("publishedOnly", "true");

      const response = await fetch(`/api/admin/tags?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setDetailError(json.error ?? "Failed to load tags");
        return;
      }

      setAvailableTags((json.tags ?? []) as AdminTagSummary[]);
    }

    loadTags().catch((loadError) => {
      if (!cancelled) {
        setDetailError(loadError instanceof Error ? loadError.message : "Failed to load tags");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredTagSearch]);

  const unassignedTags = useMemo(() => {
    if (!selected) return availableTags;
    const assignedIds = new Set(selected.tags.map((tag) => tag.id));
    return availableTags
      .filter((tag) => !assignedIds.has(tag.id))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }, [availableTags, selected]);

  async function refreshSelected(id: string) {
    const response = await fetch(`/api/admin/kirtans/${id}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to refresh kirtan");
    }
    const detail = json.kirtan as AdminKirtanDetail;
    setSelected(detail);
    setTitleDrafts({
      first_line: detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
      official: detail.titles.find((row) => row.kind === "official")?.title ?? "",
    });
  }

  async function togglePublished(nextPublished: boolean) {
    if (!selected) return;
    setPublishingState("saving");
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to update status");
      }

      const detail = json.kirtan as AdminKirtanDetail;
      setSelected(detail);
      setKirtans((current) =>
        current.map((item) =>
          item.id === detail.id ? { ...item, published: detail.published } : item,
        ),
      );
      setPublishingState("saved");
    } catch (publishError) {
      setPublishingState("error");
      setDetailError(publishError instanceof Error ? publishError.message : "Failed to update status");
    }
  }

  async function saveTitle(kind: "first_line" | "official") {
    if (!selected) return;

    const value = titleDrafts[kind]?.trim() ?? "";
    const stateKey = `title:${kind}`;
    setTitleSaveState((current) => ({ ...current, [stateKey]: "saving" }));
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}/titles/${kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save title");
      }

      await refreshSelected(selected.id);
      setTitleSaveState((current) => ({ ...current, [stateKey]: "saved" }));
    } catch (saveError) {
      setTitleSaveState((current) => ({ ...current, [stateKey]: "error" }));
      setDetailError(saveError instanceof Error ? saveError.message : "Failed to save title");
    }
  }

  async function deleteTitle(kind: "first_line" | "official") {
    if (!selected) return;
    setTitleSaveState((current) => ({ ...current, [`title:${kind}`]: "saving" }));

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}/titles/${kind}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete title");
      }

      await refreshSelected(selected.id);
      setTitleSaveState((current) => ({ ...current, [`title:${kind}`]: "saved" }));
    } catch (deleteError) {
      setTitleSaveState((current) => ({ ...current, [`title:${kind}`]: "error" }));
      setDetailError(deleteError instanceof Error ? deleteError.message : "Failed to delete title");
    }
  }

  async function addTag(tagId: string) {
    if (!selected) return;
    setTagState("saving");

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to add tag");
      }

      await refreshSelected(selected.id);
      setTagState("saved");
    } catch (tagError) {
      setTagState("error");
      setDetailError(tagError instanceof Error ? tagError.message : "Failed to add tag");
    }
  }

  async function removeTag(tagId: string) {
    if (!selected) return;
    setTagState("saving");

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}/tags/${tagId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to remove tag");
      }

      await refreshSelected(selected.id);
      setTagState("saved");
    } catch (tagError) {
      setTagState("error");
      setDetailError(tagError instanceof Error ? tagError.message : "Failed to remove tag");
    }
  }

  async function copyId() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.id);
    } catch (copyError) {
      setDetailError(copyError instanceof Error ? copyError.message : "Failed to copy ID");
    }
  }

  return (
    <div className="grid h-[calc(100vh-8.5rem)] min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className={sectionCardClassName("flex min-h-0 flex-col overflow-hidden")}>
        <div className="border-b border-[#f0ddd3] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Kirtans</h2>
              <p className="mt-1 text-sm text-[#8c6a63]">
                Search by title, singer, sanga, or sequence number, then open one kirtan at a time.
              </p>
            </div>
            <div className="rounded-full border border-[#e5d5ca] bg-white/75 px-3 py-1 text-sm font-medium text-[#8b6b62]">
              {statusLabel}
            </div>
          </div>
          <div className="mt-4 space-y-3">
              <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, singer, sanga, or sequence"
              className={fieldClassName()}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={type}
                onChange={(event) => setType(event.target.value as TypeFilter)}
                className={fieldClassName()}
              >
                <option value="all">All types</option>
                <option value="MM">Maha Mantras</option>
                <option value="BHJ">Bhajans</option>
                <option value="HK">Hari-katha</option>
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className={fieldClassName()}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            {listError ? (
              <div className="rounded-[var(--theme-radius-card)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                {listError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {kirtans.map((kirtan) => {
            const selectedItem = kirtan.id === selectedId;
            return (
              <button
                key={kirtan.id}
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setSelectedId(kirtan.id);
                  })
                }
                className={[
                  "mb-2 w-full rounded-[var(--theme-radius-card)] border p-3 text-left transition",
                  selectedItem
                    ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)]/60 shadow-[0_12px_28px_rgba(121,161,79,0.16)]"
                    : "border-transparent bg-white/70 hover:border-[#ead3c8] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#5f4338]">{kirtan.title}</p>
                    <p className="mt-1 text-xs text-[#8f6c65]">{formatMetaLine(kirtan)}</p>
                    {getSequenceLabel(kirtan) ? (
                      <p className="mt-1 text-xs font-medium text-[#9a786f]">
                        {getSequenceLabel(kirtan)}
                      </p>
                    ) : null}
                    {formatDuration(kirtan.duration_seconds) ? (
                      <p className="mt-1 text-xs text-[#a07a6e]">
                        {formatDuration(kirtan.duration_seconds)}
                      </p>
                    ) : null}
                  </div>
                  <span className={badgeClassName(kirtan.published)}>
                    {kirtan.published ? "Published" : "Hidden"}
                  </span>
                </div>
              </button>
            );
          })}
          {kirtans.length === 0 ? (
            <div className="px-3 py-8 text-sm text-[#8f6c65]">No kirtans match this view.</div>
          ) : null}
        </div>
      </section>

      <section className={sectionCardClassName("min-h-0 overflow-hidden")}>
        {selected ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[#f0ddd3] bg-[rgba(255,250,246,0.96)] px-5 py-4 backdrop-blur-md">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#b18472]">
                    Selected kirtan
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#5e433a]">
                    {selected.display_title}
                  </h2>
                  <p className="mt-2 text-sm text-[#8d6b64]">{formatMetaLine(selected)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={badgeClassName(selected.published)}>
                    {selected.published ? "Published" : "Hidden"}
                  </span>
                  <span className="text-xs text-[#9d786d]">
                    {publishingState === "saving"
                      ? "Saving…"
                      : publishingState === "saved"
                        ? "Saved"
                        : publishingState === "error"
                          ? "Error"
                          : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePublished(!selected.published)}
                    className={[
                      "rounded-[var(--theme-radius-button)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(121,161,79,0.28)]",
                      selected.published
                        ? "bg-gradient-to-r from-[#c97b73] to-[#b86161] shadow-[0_12px_26px_rgba(184,97,97,0.24)]"
                        : "bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] shadow-[0_12px_26px_rgba(121,161,79,0.28)]",
                    ].join(" ")}
                  >
                    {selected.published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {detailError ? (
                <div className="mb-4 rounded-[var(--theme-radius-card)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                  {detailError}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-4">
                  <div className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-white/75 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a47d6d]">
                      Base record
                    </h3>
                    <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm text-[#6c514a] sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Base title
                        </dt>
                        <dd className="mt-1 font-medium">{selected.title}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Type
                        </dt>
                        <dd className="mt-1 font-medium">{selected.type}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Maha Mantra sequence
                        </dt>
                        <dd className="mt-1 font-medium">
                          {selected.type === "MM" && selected.sequence_num
                            ? `#${selected.sequence_num}`
                            : "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Lead singer
                        </dt>
                        <dd className="mt-1 font-medium">{selected.lead_singer ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Sanga
                        </dt>
                        <dd className="mt-1 font-medium">{selected.sanga ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          Recorded
                        </dt>
                        <dd className="mt-1 font-medium">{selected.recorded_date ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                          ID
                        </dt>
                        <dd className="mt-1 flex items-start gap-2">
                          <span className="break-all font-mono text-xs">{selected.id}</span>
                          <button
                            type="button"
                            onClick={() => void copyId()}
                            className="rounded-[var(--theme-radius-button)] border border-[#e4d6cb] bg-white/80 p-1 text-[#8f6f65] hover:bg-[#fff7f3]"
                            aria-label="Copy kirtan ID"
                            title="Copy kirtan ID"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="10" height="10" rx="2" />
                              <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                            </svg>
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selected.type === "BHJ" ? (
                    <div className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-white/75 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a47d6d]">
                            Titles
                          </h3>
                          <p className="mt-1 text-sm text-[#8d6b64]">
                            Edit first-line and official titles inline. Changes save on blur.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        {(["first_line", "official"] as const).map((kind) => (
                          <div key={kind} className="rounded-[var(--theme-radius-card)] border border-[#f0dfd6] bg-[#fffdfa] p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[#6b514a]">{kind}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#9d786d]">
                                  {titleSaveState[`title:${kind}`] === "saving"
                                    ? "Saving…"
                                    : titleSaveState[`title:${kind}`] === "saved"
                                      ? "Saved"
                                      : titleSaveState[`title:${kind}`] === "error"
                                        ? "Error"
                                        : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteTitle(kind)}
                                  className="rounded-[var(--theme-radius-button)] border border-[#f0cfc6] px-2.5 py-1 text-xs text-[#a25f5a]"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <input
                              className={fieldClassName()}
                              value={titleDrafts[kind] ?? ""}
                              onChange={(event) =>
                                setTitleDrafts((current) => ({
                                  ...current,
                                  [kind]: event.target.value,
                                }))
                              }
                              onBlur={() => {
                                if ((titleDrafts[kind] ?? "").trim()) {
                                  void saveTitle(kind);
                                }
                              }}
                              placeholder={`Add ${kind.replace("_", " ")} title`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-white/75 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a47d6d]">
                          Tags
                        </h3>
                        <p className="mt-1 text-sm text-[#8d6b64]">
                          Remove directly from the chip, or add from the library below.
                        </p>
                      </div>
                      <span className="text-xs text-[#9d786d]">
                        {tagState === "saving"
                          ? "Saving…"
                          : tagState === "saved"
                            ? "Saved"
                            : tagState === "error"
                              ? "Error"
                              : ""}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selected.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-2 rounded-full border border-[#d7e6c8] bg-[color:var(--theme-player-green-soft)] px-3 py-1 text-sm text-[color:var(--theme-player-green)]"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => void removeTag(tag.id)}
                            className="text-[color:var(--theme-player-green)]"
                            aria-label={`Remove ${tag.name}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                      {selected.tags.length === 0 ? (
                        <p className="text-sm text-[#8d6b64]">No tags assigned yet.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-white/75 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a47d6d]">
                      Add tags
                    </h3>
                    <div className="mt-3">
                      <input
                        value={tagSearch}
                        onChange={(event) => setTagSearch(event.target.value)}
                        placeholder="Search tag library"
                        className={fieldClassName()}
                      />
                    </div>
                    <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                      {unassignedTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between rounded-[var(--theme-radius-card)] border border-[#f0dfd6] bg-[#fffdfa] px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-[#674d46]">{tag.name}</p>
                            <p className="text-xs text-[#9a786f]">
                              {tag.category} • {tag.usage_count} linked
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void addTag(tag.id)}
                            className="rounded-[var(--theme-radius-button)] border border-[#d7e6c8] bg-[color:var(--theme-player-green-soft)] px-3 py-1.5 text-sm font-medium text-[color:var(--theme-player-green)]"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                      {unassignedTags.length === 0 ? (
                        <p className="text-sm text-[#8d6b64]">No matching tags available.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[70vh] items-center justify-center px-6 text-center text-[#8d6b64]">
            {isPending ? "Loading kirtan…" : "Select a kirtan to start editing."}
          </div>
        )}
      </section>
    </div>
  );
}
