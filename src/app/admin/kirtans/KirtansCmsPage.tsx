"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type {
  AdminKirtanDetail,
  AdminKirtanListItem,
  AdminLeadSingerOption,
  AdminSangaOption,
  AdminTagSummary,
} from "@/lib/admin/types";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import { AdminKirtanAudioPlayer } from "@/app/admin/kirtans/AdminKirtanAudioPlayer";
import {
  ADMIN_AUDIO_ACCEPT,
  MAX_ADMIN_AUDIO_UPLOAD_BYTES,
  formatBytes,
  isAllowedAdminAudioFile,
} from "@/lib/admin/audioUpload";

type StatusFilter = "all" | "published" | "hidden";
type TypeFilter = "all" | "MM" | "BHJ" | "HK";
type SaveState = "idle" | "saving" | "saved" | "error";

type KirtanTitleDrafts = Partial<Record<"first_line" | "official", string>>;

function sectionCardClassName(extra = "") {
  return `rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-[rgba(255,250,246,0.92)] shadow-[0_20px_44px_rgba(170,118,91,0.12)] ${extra}`.trim();
}

function fieldClassName() {
  return "w-full rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-white/90 px-3 py-2 text-sm text-[#5d433c] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)]";
}

function badgeClassName(active: boolean) {
  return active
    ? "rounded-[0.45rem] bg-[color:var(--theme-player-green-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--theme-player-green)]"
    : "rounded-[0.45rem] bg-[#f5e5de] px-2.5 py-1 text-xs font-semibold text-[#af6f6a]";
}

function detailFieldLabelClassName() {
  return "text-sm font-medium text-[#a47d6d]";
}

function getPublishedLabel(published: boolean) {
  return published ? "Published" : "Unpublished";
}

function formatMetaLine(kirtan: AdminKirtanListItem | AdminKirtanDetail) {
  const parts = [kirtan.type, kirtan.lead_singer, kirtan.recorded_date].filter(
    Boolean,
  );
  return parts.join(" • ");
}

function formatListMetaLine(kirtan: AdminKirtanListItem | AdminKirtanDetail) {
  const parts = [kirtan.lead_singer].filter(Boolean);
  return parts.join(" • ");
}

function formatFooterMetaLine(kirtan: AdminKirtanListItem | AdminKirtanDetail) {
  const parts = [
    kirtan.type,
    formatDuration(kirtan.duration_seconds),
    kirtan.recorded_date,
  ].filter(Boolean);
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

function getListCardTitle(
  kirtan: Pick<AdminKirtanListItem, "title" | "type" | "sequence_num">,
) {
  if (kirtan.type === "MM" && kirtan.sequence_num) {
    return `Maha Mantra #${kirtan.sequence_num}`;
  }

  return kirtan.title;
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
  const [titleSaveState, setTitleSaveState] = useState<
    Record<string, SaveState>
  >({});
  const [publishingState, setPublishingState] = useState<SaveState>("idle");
  const [typeState, setTypeState] = useState<SaveState>("idle");
  const [deleteState, setDeleteState] = useState<SaveState>("idle");
  const [leadSingerOptions, setLeadSingerOptions] = useState<
    AdminLeadSingerOption[]
  >([]);
  const [sangaOptions, setSangaOptions] = useState<AdminSangaOption[]>([]);
  const [tagState, setTagState] = useState<SaveState>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] =
    useState<Exclude<TypeFilter, "all">>("MM");
  const [createLeadSingerId, setCreateLeadSingerId] = useState("");
  const [createSangaId, setCreateSangaId] = useState("");
  const [createPublished, setCreatePublished] = useState(false);
  const [createRecordedDate, setCreateRecordedDate] = useState("");
  const [createFirstLineTitle, setCreateFirstLineTitle] = useState("");
  const [createOfficialTitle, setCreateOfficialTitle] = useState("");
  const [createBaseTitle, setCreateBaseTitle] = useState("");
  const [createAudioFile, setCreateAudioFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createState, setCreateState] = useState<SaveState>("idle");
  const [isPending, startTransition] = useTransition();

  const statusLabel = hasActiveFilters
    ? `${filteredCount}/${totalCount}`
    : `${totalCount}`;

  const loadKirtans = useCallback(
    async (options?: {
      search?: string;
      type?: TypeFilter;
      status?: StatusFilter;
      nextSelectedId?: string | null;
    }) => {
      setListError(null);
      const params = new URLSearchParams();
      const searchValue = options?.search ?? deferredSearch;
      const typeValue = options?.type ?? type;
      const statusValue = options?.status ?? status;

      if (searchValue.trim()) params.set("search", searchValue.trim());
      if (typeValue !== "all") params.set("type", typeValue);
      if (statusValue !== "all") params.set("status", statusValue);

      const response = await fetch(`/api/admin/kirtans?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load kirtans");
      }

      const nextKirtans = (json.kirtans ?? []) as AdminKirtanListItem[];
      setKirtans(nextKirtans);
      setTotalCount(Number(json.totalCount ?? nextKirtans.length));
      setFilteredCount(Number(json.filteredCount ?? nextKirtans.length));
      setHasActiveFilters(Boolean(json.hasActiveFilters));
      setSelectedId((current) => {
        const target = options?.nextSelectedId ?? current;
        if (target && nextKirtans.some((item) => item.id === target)) {
          return target;
        }
        return nextKirtans[0]?.id ?? null;
      });
    },
    [deferredSearch, status, type],
  );

  useEffect(() => {
    let cancelled = false;

    async function runLoadKirtans() {
      await loadKirtans();
    }

    runLoadKirtans().catch((loadError) => {
      if (!cancelled) {
        setListError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load kirtans",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadKirtans]);

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
        first_line:
          detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
        official:
          detail.titles.find((row) => row.kind === "official")?.title ?? "",
      });
    }

    loadKirtan().catch((loadError) => {
      if (!cancelled) {
        setDetailError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load kirtan",
        );
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
      if (deferredTagSearch.trim())
        params.set("search", deferredTagSearch.trim());
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
        setDetailError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load tags",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredTagSearch]);

  useEffect(() => {
    let cancelled = false;

    async function loadCreateOptions() {
      const response = await fetch("/api/admin/kirtans/options", {
        cache: "no-store",
      });
      const json = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load create options");
      }

      const nextLeadSingers = (json.leadSingers ??
        []) as AdminLeadSingerOption[];
      const nextSangas = (json.sangas ?? []) as AdminSangaOption[];
      setLeadSingerOptions(nextLeadSingers);
      setSangaOptions(nextSangas);
      setCreateLeadSingerId(
        (current) => current || nextLeadSingers[0]?.id || "",
      );
    }

    loadCreateOptions().catch((loadError) => {
      if (!cancelled) {
        setDetailError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load create options",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const unassignedTags = useMemo(() => {
    if (!selected) return availableTags;
    const assignedIds = new Set(selected.tags.map((tag) => tag.id));
    return availableTags
      .filter((tag) => !assignedIds.has(tag.id))
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
  }, [availableTags, selected]);

  async function refreshSelected(id: string) {
    const response = await fetch(`/api/admin/kirtans/${id}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to refresh kirtan");
    }
    const detail = json.kirtan as AdminKirtanDetail;
    setSelected(detail);
    setTitleDrafts({
      first_line:
        detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
      official:
        detail.titles.find((row) => row.kind === "official")?.title ?? "",
    });
  }

  function handleAudioReplaced(detail: AdminKirtanDetail) {
    setSelected(detail);
    setTitleDrafts({
      first_line:
        detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
      official:
        detail.titles.find((row) => row.kind === "official")?.title ?? "",
    });
    setDetailError(null);
    setKirtans((current) =>
      current.map((item) =>
        item.id === detail.id
          ? {
              ...item,
              duration_seconds: detail.duration_seconds,
            }
          : item,
      ),
    );
  }

  async function deleteKirtan() {
    if (!selected) {
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete the kirtan, its titles, tags, audio records, and the current audio file from Cloudflare. This cannot be undone. Continue?",
    );

    if (!confirmed) {
      return;
    }

    setDeleteState("saving");
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}`, {
        method: "DELETE",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete kirtan");
      }

      const deletedId = selected.id;
      setSelected(null);
      setSelectedId(null);
      await loadKirtans({
        nextSelectedId: null,
      });
      setKirtans((current) => current.filter((item) => item.id !== deletedId));
      setDeleteState("saved");
    } catch (deleteError) {
      setDeleteState("error");
      setDetailError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete kirtan",
      );
    }
  }

  async function changeType(nextType: TypeFilter) {
    if (
      !selected ||
      (nextType !== "MM" && nextType !== "BHJ" && nextType !== "HK")
    ) {
      return;
    }

    setTypeState("saving");
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/kirtans/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: nextType }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to update type");
      }

      const detail = json.kirtan as AdminKirtanDetail;
      setSelected(detail);
      setTitleDrafts({
        first_line:
          detail.titles.find((row) => row.kind === "first_line")?.title ?? "",
        official:
          detail.titles.find((row) => row.kind === "official")?.title ?? "",
      });
      setKirtans((current) =>
        current.map((item) =>
          item.id === detail.id
            ? {
                ...item,
                title: detail.title,
                type: detail.type,
                sequence_num: detail.sequence_num,
              }
            : item,
        ),
      );
      setTypeState("saved");
    } catch (typeError) {
      setTypeState("error");
      setDetailError(
        typeError instanceof Error
          ? typeError.message
          : "Failed to update type",
      );
    }
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
          item.id === detail.id
            ? { ...item, published: detail.published }
            : item,
        ),
      );
      setPublishingState("saved");
    } catch (publishError) {
      setPublishingState("error");
      setDetailError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to update status",
      );
    }
  }

  async function saveTitle(kind: "first_line" | "official") {
    if (!selected) return;

    const value = titleDrafts[kind]?.trim() ?? "";
    const stateKey = `title:${kind}`;
    setTitleSaveState((current) => ({ ...current, [stateKey]: "saving" }));
    setDetailError(null);

    try {
      const response = await fetch(
        `/api/admin/kirtans/${selected.id}/titles/${kind}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: value }),
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save title");
      }

      await refreshSelected(selected.id);
      setTitleSaveState((current) => ({ ...current, [stateKey]: "saved" }));
    } catch (saveError) {
      setTitleSaveState((current) => ({ ...current, [stateKey]: "error" }));
      setDetailError(
        saveError instanceof Error ? saveError.message : "Failed to save title",
      );
    }
  }

  async function deleteTitle(kind: "first_line" | "official") {
    if (!selected) return;
    setTitleSaveState((current) => ({
      ...current,
      [`title:${kind}`]: "saving",
    }));

    try {
      const response = await fetch(
        `/api/admin/kirtans/${selected.id}/titles/${kind}`,
        {
          method: "DELETE",
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete title");
      }

      await refreshSelected(selected.id);
      setTitleSaveState((current) => ({
        ...current,
        [`title:${kind}`]: "saved",
      }));
    } catch (deleteError) {
      setTitleSaveState((current) => ({
        ...current,
        [`title:${kind}`]: "error",
      }));
      setDetailError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete title",
      );
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
      setDetailError(
        tagError instanceof Error ? tagError.message : "Failed to add tag",
      );
    }
  }

  async function removeTag(tagId: string) {
    if (!selected) return;
    setTagState("saving");

    try {
      const response = await fetch(
        `/api/admin/kirtans/${selected.id}/tags/${tagId}`,
        {
          method: "DELETE",
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to remove tag");
      }

      await refreshSelected(selected.id);
      setTagState("saved");
    } catch (tagError) {
      setTagState("error");
      setDetailError(
        tagError instanceof Error ? tagError.message : "Failed to remove tag",
      );
    }
  }

  async function copyId() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.id);
    } catch (copyError) {
      setDetailError(
        copyError instanceof Error ? copyError.message : "Failed to copy ID",
      );
    }
  }

  function resetCreateForm() {
    setCreateType("MM");
    setCreateLeadSingerId(leadSingerOptions[0]?.id ?? "");
    setCreateSangaId("");
    setCreatePublished(false);
    setCreateRecordedDate("");
    setCreateFirstLineTitle("");
    setCreateOfficialTitle("");
    setCreateBaseTitle("");
    setCreateAudioFile(null);
    setCreateError(null);
    setCreateState("idle");
  }

  function readAudioDuration(file: File) {
    return new Promise<number>((resolve, reject) => {
      const nextAudio = document.createElement("audio");
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        nextAudio.removeAttribute("src");
        nextAudio.load();
      };

      nextAudio.preload = "metadata";
      nextAudio.onloadedmetadata = () => {
        const nextDuration = Math.max(1, Math.round(nextAudio.duration));
        cleanup();

        if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
          reject(new Error("The selected audio duration could not be read."));
          return;
        }

        resolve(nextDuration);
      };

      nextAudio.onerror = () => {
        cleanup();
        reject(new Error("The selected audio file could not be read."));
      };

      nextAudio.src = objectUrl;
    });
  }

  async function createKirtan() {
    if (!createAudioFile) {
      setCreateError("Audio file is required.");
      return;
    }

    if (!isAllowedAdminAudioFile(createAudioFile)) {
      setCreateError("Please choose a supported audio file.");
      return;
    }

    if (createAudioFile.size > MAX_ADMIN_AUDIO_UPLOAD_BYTES) {
      setCreateError(
        `Audio files must be ${formatBytes(MAX_ADMIN_AUDIO_UPLOAD_BYTES)} or smaller.`,
      );
      return;
    }

    if (!createLeadSingerId) {
      setCreateError("Lead singer is required.");
      return;
    }

    if (createType === "BHJ" && !createFirstLineTitle.trim()) {
      setCreateError("First line title is required for bhajans.");
      return;
    }

    if (createType === "HK" && !createBaseTitle.trim()) {
      setCreateError("Base title is required for Hari Katha.");
      return;
    }

    setCreateState("saving");
    setCreateError(null);

    try {
      const durationSeconds = await readAudioDuration(createAudioFile);
      const formData = new FormData();
      formData.append("type", createType);
      formData.append("leadSingerId", createLeadSingerId);
      formData.append("sangaId", createSangaId);
      formData.append("published", createPublished ? "true" : "false");
      formData.append("recordedDate", createRecordedDate);
      formData.append("firstLineTitle", createFirstLineTitle);
      formData.append("officialTitle", createOfficialTitle);
      formData.append("baseTitle", createBaseTitle);
      formData.append("durationSeconds", String(durationSeconds));
      formData.append("audio", createAudioFile);

      const response = await fetch("/api/admin/kirtans", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to create kirtan");
      }

      setSearch("");
      setType("all");
      setStatus("all");
      await loadKirtans({
        search: "",
        type: "all",
        status: "all",
        nextSelectedId: json.id as string,
      });
      setIsCreateModalOpen(false);
      resetCreateForm();
      setCreateState("saved");
    } catch (createKirtanError) {
      setCreateState("error");
      setCreateError(
        createKirtanError instanceof Error
          ? createKirtanError.message
          : "Failed to create kirtan",
      );
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <section
        className={sectionCardClassName(
          "flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-0 lg:max-h-[calc(100vh-3rem)]",
        )}
      >
        <div className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[1.75rem] leading-none font-semibold text-[#5d4036]">
                Kirtans
              </h2>
              <p className="font-display mt-2 text-[1.1rem] leading-[1.2] text-[#8c6a63]">
                Search by title, singer, sanga, or sequence number.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="rounded-[0.7rem] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-3 py-1.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(121,161,79,0.22)]"
            >
              New
            </button>
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
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                className={fieldClassName()}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <p className="text-xs text-[#8f6c65]">Count: {statusLabel}</p>
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
                  "mb-2 w-full rounded-[var(--theme-radius-surface)] border p-3 text-left transition",
                  selectedItem
                    ? "border-2 border-[color:var(--theme-green-surface-border)] bg-[color:var(--theme-player-green-soft)]/45 shadow-[0_12px_28px_rgba(121,161,79,0.14)]"
                    : "border border-[color:var(--theme-page-home-discovery-gold)] bg-white/70 hover:border-[color:var(--theme-page-home-discovery-gold)] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ead7cd] bg-[rgba(255,252,249,0.96)] shadow-[inset_0_0_0_1px_rgba(210,183,160,0.18)]">
                      <LeadSingerAvatar
                        name={kirtan.lead_singer}
                        imageUrl={kirtan.lead_singer_image_url}
                        alt={kirtan.lead_singer_image_alt}
                        className="h-full w-full"
                        imageClassName="h-full w-full object-cover"
                        textClassName="absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate font-display text-[1.14rem] leading-[0.95] font-semibold text-[#5f4338]"
                        title={getListCardTitle(kirtan)}
                      >
                        {getListCardTitle(kirtan)}
                      </p>
                      <p className="mt-1 text-[0.77rem] leading-[0.8] text-[#8f6c65]">
                        {formatListMetaLine(kirtan)}
                      </p>
                      {formatFooterMetaLine(kirtan) ? (
                        <p className="mt-3 text-[0.74rem] leading-[0.8] text-[#a07a6e]">
                          {formatFooterMetaLine(kirtan)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className={badgeClassName(kirtan.published)}>
                    {getPublishedLabel(kirtan.published)}
                  </span>
                </div>
              </button>
            );
          })}
          {kirtans.length === 0 ? (
            <div className="px-3 py-8 text-sm text-[#8f6c65]">
              No kirtans match this view.
            </div>
          ) : null}
        </div>
      </section>

      <section className={sectionCardClassName("min-w-0 overflow-hidden")}>
        {selected ? (
          <div className="flex min-h-0 flex-col">
            <div className="bg-[rgba(255,250,246,0.96)] backdrop-blur-md">
              <div className="flex flex-col">
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                  {selected.lead_singer_image_url ? (
                    <div className="m-4 mb-4 h-full w-full max-w-[164px] shrink-0 overflow-hidden rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)]">
                      <LeadSingerAvatar
                        name={selected.lead_singer}
                        imageUrl={selected.lead_singer_image_url}
                        alt={selected.lead_singer_image_alt}
                        className="h-full w-full"
                        imageClassName="h-full min-h-[124px] w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#b18472]">
                      Selected kirtan
                    </p>
                    <h2 className="font-display mt-1 text-[2.45rem] leading-none font-bold text-[#5e433a]">
                      {selected.display_title}
                    </h2>
                    <p className="mt-2 text-sm text-[#8d6b64]">
                      {formatMetaLine(selected)}
                    </p>
                    {formatDuration(selected.duration_seconds) ? (
                      <p className="mt-2 text-xs font-medium text-[#9d786d]">
                        {formatDuration(selected.duration_seconds)}
                      </p>
                    ) : null}
                    <div className="pt-4 flex items-center gap-3">
                      <span className={badgeClassName(selected.published)}>
                        {getPublishedLabel(selected.published)}
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
                          "cursor-pointer rounded-[0.7rem] border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
                          selected.published
                            ? "border-[#e7cfc7] bg-[#f5e5de] text-[#af6f6a] hover:border-[#deb8af] hover:bg-[#fbefea]"
                            : "border-[#c7d9ba] bg-[color:var(--theme-player-green-soft)] text-[color:var(--theme-player-green)] hover:border-[#aac392] hover:bg-[#eef6e6]",
                        ].join(" ")}
                      >
                        {selected.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteKirtan()}
                        className="cursor-pointer rounded-[0.7rem] border border-[#e7cfc7] bg-[#f5e5de] px-2.5 py-1 text-xs font-semibold text-[#af6f6a] transition-colors hover:border-[#deb8af] hover:bg-[#fbefea] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleteState === "saving" ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
                <AdminKirtanAudioPlayer
                  key={selected.id}
                  kirtanId={selected.id}
                  title={selected.display_title}
                  audioUrl={selected.audio_url}
                  waveformUrl={
                    selected.audio_url
                      ? `/api/admin/kirtans/${selected.id}/audio-file`
                      : null
                  }
                  fileName={selected.audio_file_name}
                  durationSeconds={selected.duration_seconds}
                  onAudioReplaced={handleAudioReplaced}
                />
              </div>
            </div>

            <div className="px-5 py-4">
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
                        <dt className={detailFieldLabelClassName()}>
                          Base title
                        </dt>
                        <dd className="mt-1 font-medium">{selected.title}</dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>Type</dt>
                        <dd className="mt-1">
                          <div className="flex items-center gap-3">
                            <select
                              value={selected.type}
                              onChange={(event) =>
                                void changeType(
                                  event.target.value as TypeFilter,
                                )
                              }
                              className="rounded-[0.7rem] border border-[color:var(--theme-page-home-discovery-gold)] bg-white/90 px-3 py-2 text-sm font-medium text-[#6c514a] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)]"
                            >
                              <option value="MM">Maha Mantra</option>
                              <option value="BHJ">Bhajan</option>
                              <option value="HK">Hari-katha</option>
                            </select>
                            <span className="text-xs text-[#9d786d]">
                              {typeState === "saving"
                                ? "Saving…"
                                : typeState === "saved"
                                  ? "Saved"
                                  : typeState === "error"
                                    ? "Error"
                                    : ""}
                            </span>
                          </div>
                        </dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>
                          Maha Mantra sequence
                        </dt>
                        <dd className="mt-1 font-medium">
                          {selected.type === "MM" && selected.sequence_num
                            ? `#${selected.sequence_num}`
                            : "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>
                          Lead singer
                        </dt>
                        <dd className="mt-1 font-medium">
                          {selected.lead_singer ?? "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>Sanga</dt>
                        <dd className="mt-1 font-medium">
                          {selected.sanga ?? "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>
                          Recorded
                        </dt>
                        <dd className="mt-1 font-medium">
                          {selected.recorded_date ?? "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt className={detailFieldLabelClassName()}>ID</dt>
                        <dd className="mt-1 flex items-start gap-2">
                          <span className="break-all font-mono text-xs">
                            {selected.id}
                          </span>
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
                            Edit first-line and official titles inline. Changes
                            save on blur.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        {(["first_line", "official"] as const).map((kind) => (
                          <div
                            key={kind}
                            className="rounded-[var(--theme-radius-card)] border border-[#f0dfd6] bg-[#fffdfa] p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[#6b514a]">
                                {kind}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#9d786d]">
                                  {titleSaveState[`title:${kind}`] === "saving"
                                    ? "Saving…"
                                    : titleSaveState[`title:${kind}`] ===
                                        "saved"
                                      ? "Saved"
                                      : titleSaveState[`title:${kind}`] ===
                                          "error"
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
                          Remove directly from the chip, or add from the library
                          below.
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
                        <p className="text-sm text-[#8d6b64]">
                          No tags assigned yet.
                        </p>
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
                            <p className="text-sm font-medium text-[#674d46]">
                              {tag.name}
                            </p>
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
                        <p className="text-sm text-[#8d6b64]">
                          No matching tags available.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[70vh] items-center justify-center px-6 text-center text-[#8d6b64]">
            {isPending
              ? "Loading kirtan…"
              : "Select a kirtan to start editing."}
          </div>
        )}
      </section>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(78,52,41,0.26)] px-4">
          <div className="w-full max-w-2xl rounded-[var(--theme-radius-surface)] border border-[color:var(--theme-page-home-discovery-gold)] bg-[rgba(255,250,246,0.98)] p-5 shadow-[0_24px_64px_rgba(119,79,58,0.22)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#b18472]">
                  New Kirtan
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[#5f4338]">
                  Create a kirtan
                </h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={detailFieldLabelClassName()}>Type</label>
                <select
                  value={createType}
                  onChange={(event) =>
                    setCreateType(
                      event.target.value as Exclude<TypeFilter, "all">,
                    )
                  }
                  className={`${fieldClassName()} mt-1`}
                >
                  <option value="MM">Maha Mantra</option>
                  <option value="BHJ">Bhajan</option>
                  <option value="HK">Hari Katha</option>
                </select>
              </div>

              {createType === "BHJ" ? (
                <>
                  <div className="md:col-span-2">
                    <label className={detailFieldLabelClassName()}>
                      First Line Title (first line of the song)
                    </label>
                    <input
                      value={createFirstLineTitle}
                      onChange={(event) =>
                        setCreateFirstLineTitle(event.target.value)
                      }
                      className={`${fieldClassName()} mt-1`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={detailFieldLabelClassName()}>
                      Official Title (if applicable)
                    </label>
                    <input
                      value={createOfficialTitle}
                      onChange={(event) =>
                        setCreateOfficialTitle(event.target.value)
                      }
                      className={`${fieldClassName()} mt-1`}
                    />
                  </div>
                </>
              ) : null}

              {createType === "HK" ? (
                <div className="md:col-span-2">
                  <label className={detailFieldLabelClassName()}>
                    Base title
                  </label>
                  <input
                    value={createBaseTitle}
                    onChange={(event) => setCreateBaseTitle(event.target.value)}
                    className={`${fieldClassName()} mt-1`}
                  />
                </div>
              ) : null}

              <div>
                <label className={detailFieldLabelClassName()}>
                  Lead singer
                </label>
                <select
                  value={createLeadSingerId}
                  onChange={(event) =>
                    setCreateLeadSingerId(event.target.value)
                  }
                  className={`${fieldClassName()} mt-1`}
                >
                  {leadSingerOptions.map((leadSinger) => (
                    <option key={leadSinger.id} value={leadSinger.id}>
                      {leadSinger.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={detailFieldLabelClassName()}>Sanga</label>
                <select
                  value={createSangaId}
                  onChange={(event) => setCreateSangaId(event.target.value)}
                  className={`${fieldClassName()} mt-1`}
                >
                  <option value="">No sanga</option>
                  {sangaOptions.map((sanga) => (
                    <option key={sanga.id} value={sanga.id}>
                      {sanga.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={detailFieldLabelClassName()}>Published</label>
                <select
                  value={createPublished ? "true" : "false"}
                  onChange={(event) =>
                    setCreatePublished(event.target.value === "true")
                  }
                  className={`${fieldClassName()} mt-1`}
                >
                  <option value="false">Unpublished</option>
                  <option value="true">Published</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={detailFieldLabelClassName()}>
                  Recorded date
                </label>
                <input
                  value={createRecordedDate}
                  onChange={(event) =>
                    setCreateRecordedDate(event.target.value)
                  }
                  placeholder="yyyy/mm/dd"
                  className={`${fieldClassName()} mt-1`}
                />
              </div>

              <div className="md:col-span-2">
                <label className={detailFieldLabelClassName()}>
                  Audio file
                </label>
                <input
                  type="file"
                  accept={ADMIN_AUDIO_ACCEPT}
                  onChange={(event) =>
                    setCreateAudioFile(event.target.files?.[0] ?? null)
                  }
                  className={`${fieldClassName()} mt-1 file:mr-3 file:rounded-[0.6rem] file:border-0 file:bg-[color:var(--theme-player-green-soft)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[color:var(--theme-player-green)]`}
                />
                {createAudioFile ? (
                  <p className="mt-2 text-xs text-[#8f6c65]">
                    {createAudioFile.name} • {formatBytes(createAudioFile.size)}
                  </p>
                ) : null}
              </div>
            </div>

            {createError ? (
              <div className="mt-4 rounded-[var(--theme-radius-card)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                {createError}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void createKirtan()}
                disabled={createState === "saving"}
                className="rounded-[var(--theme-radius-button)] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(121,161,79,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createState === "saving" ? "Creating..." : "Create kirtan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="rounded-[var(--theme-radius-button)] border border-[#ead6cb] bg-white/80 px-4 py-2 text-sm font-medium text-[#8f6c65]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
