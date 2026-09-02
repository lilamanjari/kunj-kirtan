"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type {
  AdminLeadSingerDetail,
  AdminLeadSingerKirtanListState,
  AdminLeadSingerSummary,
  AdminSangaOption,
} from "@/lib/admin/types";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import {
  ADMIN_LEAD_SINGER_IMAGE_ACCEPT,
  MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES,
  isAllowedAdminLeadSingerImageFile,
} from "@/lib/admin/leadSingerImageUpload";
import { formatBytes } from "@/lib/admin/audioUpload";
import {
  adminDangerButtonClassName,
  adminDetailFieldLabelClassName,
  adminFieldClassName,
  adminPanelDescriptionClassName,
  adminPanelHeadingClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSectionCardClassName,
} from "@/lib/admin/ui";

type IdentifiedFilter = "all" | "identified" | "hidden";
type SaveState = "idle" | "saving" | "saved" | "error";
const DEFAULT_IMAGE_FOCUS_X = 50;
const DEFAULT_IMAGE_FOCUS_Y = 35;

function formatLeadSingerMeta(
  leadSinger: Pick<
    AdminLeadSingerSummary,
    "kirtan_count" | "home_sanga_name" | "is_identified"
  >,
) {
  const parts = [
    `${leadSinger.kirtan_count} ${leadSinger.kirtan_count === 1 ? "kirtan" : "kirtans"}`,
    leadSinger.home_sanga_name,
    leadSinger.is_identified ? "Visible in Explore" : "Hidden from Explore",
  ].filter(Boolean);
  return parts.join(" • ");
}

function formatKirtanTypeLabel(type: string, sequenceNum: number | null) {
  if (type === "MM" && sequenceNum) {
    return `MM #${sequenceNum}`;
  }
  return type;
}

function clampFocusValue(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_FOCUS_X;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function LeadSingerPortraitFocusControl({
  title,
  helperText,
  name,
  imageUrl,
  alt,
  focusX,
  focusY,
  onChange,
}: {
  title: string;
  helperText: string;
  name: string;
  imageUrl: string | null;
  alt: string | null;
  focusX: number;
  focusY: number;
  onChange: (nextFocusX: number, nextFocusY: number) => void;
}) {
  function handlePreviewClick(event: ReactMouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextFocusX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const nextFocusY = ((event.clientY - bounds.top) / bounds.height) * 100;
    onChange(clampFocusValue(nextFocusX), clampFocusValue(nextFocusY));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={handlePreviewClick}
          className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-[#ead7cd] bg-[#f7ece5] shadow-[inset_0_0_0_1px_rgba(210,183,160,0.16)]"
          title="Click the portrait to set the crop center"
        >
          <LeadSingerAvatar
            name={name}
            imageUrl={imageUrl}
            alt={alt}
            focusX={focusX}
            focusY={focusY}
          />
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[rgba(176,127,112,0.88)] shadow-[0_2px_8px_rgba(93,67,60,0.28)]"
            style={{ left: `${focusX}%`, top: `${focusY}%` }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40 transition group-hover:ring-white/70" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#8c6a63]">
            {helperText}
          </p>
          <p className="mt-2 text-xs text-[#9a776b]">
            Focus: {focusX.toFixed(1)}% x, {focusY.toFixed(1)}% y
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#75584d]">
          <span className={adminDetailFieldLabelClassName()}>
            Horizontal focus
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={focusX}
            onChange={(event) =>
              onChange(clampFocusValue(Number(event.target.value)), focusY)
            }
            className="mt-2 w-full accent-[color:var(--theme-player-green)]"
          />
        </label>
        <label className="text-sm text-[#75584d]">
          <span className={adminDetailFieldLabelClassName()}>
            Vertical focus
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={focusY}
            onChange={(event) =>
              onChange(focusX, clampFocusValue(Number(event.target.value)))
            }
            className="mt-2 w-full accent-[color:var(--theme-player-green)]"
          />
        </label>
      </div>
    </div>
  );
}

export function LeadSingersCmsPage() {
  const [search, setSearch] = useState("");
  const [identified, setIdentified] = useState<IdentifiedFilter>("all");
  const deferredSearch = useDeferredValue(search);
  const [leadSingers, setLeadSingers] = useState<AdminLeadSingerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminLeadSingerDetail | null>(null);
  const [linkedKirtanState, setLinkedKirtanState] =
    useState<AdminLeadSingerKirtanListState>({
      kirtans: [],
      total_count: 0,
      has_more: false,
      next_offset: null,
    });
  const [sangaOptions, setSangaOptions] = useState<AdminSangaOption[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [createState, setCreateState] = useState<SaveState>("idle");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [canonicalName, setCanonicalName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [homeSangaId, setHomeSangaId] = useState("");
  const [priority, setPriority] = useState("100");
  const [isIdentified, setIsIdentified] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFocusX, setImageFocusX] = useState(DEFAULT_IMAGE_FOCUS_X);
  const [imageFocusY, setImageFocusY] = useState(DEFAULT_IMAGE_FOCUS_Y);

  const [newDisplayName, setNewDisplayName] = useState("");
  const [newCanonicalName, setNewCanonicalName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHomeSangaId, setNewHomeSangaId] = useState("");
  const [newPriority, setNewPriority] = useState("100");
  const [newIsIdentified, setNewIsIdentified] = useState(true);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreviewUrl, setNewImagePreviewUrl] = useState<string | null>(
    null,
  );
  const [newImageFocusX, setNewImageFocusX] = useState(DEFAULT_IMAGE_FOCUS_X);
  const [newImageFocusY, setNewImageFocusY] = useState(DEFAULT_IMAGE_FOCUS_Y);
  const [isLoadingMoreKirtans, setIsLoadingMoreKirtans] = useState(false);
  const kirtanLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  const previewImageUrl = imagePreviewUrl ?? selected?.image_url ?? null;
  const hasUnsavedChanges = useMemo(() => {
    if (!selected) return false;

    return (
      displayName.trim() !== selected.display_name ||
      canonicalName.trim() !== selected.canonical_name ||
      slug.trim() !== selected.slug ||
      description.trim() !== (selected.description ?? "") ||
      homeSangaId !== (selected.home_sanga_id ?? "") ||
      (priority.trim() || "100") !== String(selected.priority) ||
      isIdentified !== selected.is_identified ||
      imageFile !== null ||
      imageFocusX !== (selected.image_focus_x ?? DEFAULT_IMAGE_FOCUS_X) ||
      imageFocusY !== (selected.image_focus_y ?? DEFAULT_IMAGE_FOCUS_Y)
    );
  }, [
    canonicalName,
    description,
    displayName,
    homeSangaId,
    imageFile,
    imageFocusX,
    imageFocusY,
    isIdentified,
    priority,
    selected,
    slug,
  ]);

  const loadLeadSingers = useCallback(
    async (nextSelectedId?: string | null) => {
      setListError(null);
      const params = new URLSearchParams();
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (identified !== "all") params.set("identified", identified);

      const response = await fetch(
        `/api/admin/lead-singers?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load lead singers");
      }

      const nextLeadSingers = (json.leadSingers ??
        []) as AdminLeadSingerSummary[];
      setLeadSingers(nextLeadSingers);
      setSelectedId((current) => {
        const target = nextSelectedId ?? current;
        if (
          target &&
          nextLeadSingers.some((leadSinger) => leadSinger.id === target)
        ) {
          return target;
        }
        return nextLeadSingers[0]?.id ?? null;
      });
    },
    [deferredSearch, identified],
  );

  const loadSelected = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/lead-singers/${id}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to load lead singer");
    }

    const leadSinger = json.leadSinger as AdminLeadSingerDetail;
    setSelected(leadSinger);
    setDisplayName(leadSinger.display_name);
    setCanonicalName(leadSinger.canonical_name);
    setSlug(leadSinger.slug);
    setDescription(leadSinger.description ?? "");
    setHomeSangaId(leadSinger.home_sanga_id ?? "");
    setPriority(String(leadSinger.priority));
    setIsIdentified(leadSinger.is_identified);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageFocusX(leadSinger.image_focus_x ?? DEFAULT_IMAGE_FOCUS_X);
    setImageFocusY(leadSinger.image_focus_y ?? DEFAULT_IMAGE_FOCUS_Y);
    setLinkedKirtanState({
      kirtans: leadSinger.kirtans ?? [],
      total_count: leadSinger.kirtans_total_count ?? 0,
      has_more: Boolean(leadSinger.kirtans_has_more),
      next_offset: leadSinger.kirtans_next_offset ?? null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLeadSingers().catch((loadError) => {
      if (!cancelled) {
        setListError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load lead singers",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadLeadSingers]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    loadSelected(selectedId).catch((loadError) => {
      if (!cancelled) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load lead singer",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadSelected, selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const response = await fetch("/api/admin/lead-singers/options", {
        cache: "no-store",
      });
      const json = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load sanga options");
      }

      setSangaOptions((json.sangas ?? []) as AdminSangaOption[]);
    }

    loadOptions().catch((loadError) => {
      if (!cancelled) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load sanga options",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!newImageFile) {
      setNewImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(newImageFile);
    setNewImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [newImageFile]);

  function resetCreateForm() {
    setNewDisplayName("");
    setNewCanonicalName("");
    setNewSlug("");
    setNewDescription("");
    setNewHomeSangaId("");
    setNewPriority("100");
    setNewIsIdentified(true);
    setNewImageFile(null);
    setNewImagePreviewUrl(null);
    setNewImageFocusX(DEFAULT_IMAGE_FOCUS_X);
    setNewImageFocusY(DEFAULT_IMAGE_FOCUS_Y);
    setCreateState("idle");
  }

  function validateImage(file: File) {
    if (!isAllowedAdminLeadSingerImageFile(file)) {
      throw new Error("Please choose a JPG, PNG, WebP, or AVIF image.");
    }
    if (
      file.size <= 0 ||
      file.size > MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES
    ) {
      throw new Error(
        `Images must be ${formatBytes(MAX_ADMIN_LEAD_SINGER_IMAGE_UPLOAD_BYTES)} or smaller.`,
      );
    }
  }

  async function saveLeadSinger() {
    if (!selected) return;

    try {
      setSaveState("saving");
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append("displayName", displayName.trim());
      formData.append("canonicalName", canonicalName.trim());
      formData.append("slug", slug.trim());
      formData.append("description", description.trim());
      formData.append("homeSangaId", homeSangaId);
      formData.append("priority", priority.trim() || "100");
      formData.append("isIdentified", isIdentified ? "true" : "false");
      formData.append("focusX", String(imageFocusX));
      formData.append("focusY", String(imageFocusY));
      if (imageFile) {
        validateImage(imageFile);
        formData.append("image", imageFile);
      }

      const response = await fetch(`/api/admin/lead-singers/${selected.id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save lead singer");
      }

      setMessage("Lead singer saved.");
      setSaveState("saved");
      await loadLeadSingers(selected.id);
      await loadSelected(selected.id);
    } catch (saveError) {
      setSaveState("error");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save lead singer",
      );
    }
  }

  async function createLeadSinger() {
    try {
      setCreateState("saving");
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append("displayName", newDisplayName.trim());
      formData.append("canonicalName", newCanonicalName.trim());
      formData.append("slug", newSlug.trim());
      formData.append("description", newDescription.trim());
      formData.append("homeSangaId", newHomeSangaId);
      formData.append("priority", newPriority.trim() || "100");
      formData.append("isIdentified", newIsIdentified ? "true" : "false");
      formData.append("focusX", String(newImageFocusX));
      formData.append("focusY", String(newImageFocusY));
      if (newImageFile) {
        validateImage(newImageFile);
        formData.append("image", newImageFile);
      }

      const response = await fetch("/api/admin/lead-singers", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to create lead singer");
      }

      setMessage("Lead singer created.");
      setCreateState("saved");
      await loadLeadSingers(json.id);
      setIsCreateModalOpen(false);
      resetCreateForm();
    } catch (createError) {
      setCreateState("error");
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create lead singer",
      );
    }
  }

  async function deleteLeadSinger() {
    if (!selected) return;

    const confirmed = window.confirm(
      selected.kirtan_count > 0
        ? `This lead singer still has ${selected.kirtan_count} linked kirtans. Reassign them before deleting this lead singer.`
        : `Delete ${selected.display_name}? This cannot be undone.`,
    );
    if (!confirmed || selected.kirtan_count > 0) return;

    try {
      setSaveState("saving");
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/admin/lead-singers/${selected.id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete lead singer");
      }

      setMessage("Lead singer deleted.");
      setSelected(null);
      setSaveState("saved");
      await loadLeadSingers(null);
    } catch (deleteError) {
      setSaveState("error");
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete lead singer",
      );
    }
  }

  useEffect(() => {
    if (!selectedId || !linkedKirtanState.has_more || isLoadingMoreKirtans) {
      return;
    }

    const root = detailScrollRef.current;
    const target = kirtanLoadMoreRef.current;
    const nextOffset = linkedKirtanState.next_offset;

    if (!root || !target || nextOffset === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        setIsLoadingMoreKirtans(true);
        fetch(
          `/api/admin/lead-singers/${selectedId}/kirtans?offset=${nextOffset}&limit=20`,
          { cache: "no-store" },
        )
          .then(async (response) => {
            const json = await response.json();
            if (!response.ok) {
              throw new Error(json.error ?? "Failed to load more kirtans");
            }

            setLinkedKirtanState((current) => ({
              kirtans: [...current.kirtans, ...(json.kirtans ?? [])],
              total_count: Number(json.total_count ?? current.total_count),
              has_more: Boolean(json.has_more),
              next_offset:
                json.next_offset === null || json.next_offset === undefined
                  ? null
                  : Number(json.next_offset),
            }));
          })
          .catch((loadError) => {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Failed to load more kirtans",
            );
          })
          .finally(() => setIsLoadingMoreKirtans(false));
      },
      { root, rootMargin: "200px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    isLoadingMoreKirtans,
    linkedKirtanState.has_more,
    linkedKirtanState.next_offset,
    selectedId,
  ]);

  return (
    <>
      <div className="grid h-[calc(100vh-8.5rem)] min-h-0 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <section
          className={adminSectionCardClassName(
            "flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <div className="px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={adminPanelHeadingClassName()}>Lead Singers</h2>
                <p className={adminPanelDescriptionClassName()}>
                  Create and manage lead singer records and portraits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  resetCreateForm();
                  setIsCreateModalOpen(true);
                }}
                className={adminPrimaryButtonClassName()}
              >
                New
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search lead singers"
                className={adminFieldClassName()}
              />
              <select
                value={identified}
                onChange={(event) =>
                  setIdentified(event.target.value as IdentifiedFilter)
                }
                className={adminFieldClassName()}
              >
                <option value="all">All lead singers</option>
                <option value="identified">Visible in Explore</option>
                <option value="hidden">Hidden from Explore</option>
              </select>
              <p className="text-sm text-[#9f7c72]">
                Count: {leadSingers.length}
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {listError ? (
              <div className="mx-2 mb-2 rounded-[var(--theme-radius-surface)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                {listError}
              </div>
            ) : null}

            {leadSingers.map((leadSinger) => (
              <button
                key={leadSinger.id}
                type="button"
                onClick={() => {
                  setMessage(null);
                  setError(null);
                  setSaveState("idle");
                  setSelectedId(leadSinger.id);
                }}
                className={[
                  "mb-2 flex w-full items-center gap-3 rounded-[var(--theme-radius-surface)] border px-4 py-3 text-left transition",
                  selectedId === leadSinger.id
                    ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)]/60 shadow-[0_14px_30px_rgba(121,161,79,0.16)]"
                    : "border-transparent bg-white/72 hover:border-[color:var(--theme-page-home-discovery-gold)] hover:bg-white/90",
                ].join(" ")}
              >
                <div className="h-14 w-14 overflow-hidden rounded-full bg-[#f7ece5]">
                  <LeadSingerAvatar
                    name={leadSinger.display_name}
                    imageUrl={leadSinger.image_url}
                    alt={leadSinger.image_alt}
                    focusX={leadSinger.image_focus_x}
                    focusY={leadSinger.image_focus_y}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.05rem] leading-none text-[#5d433c]">
                    {leadSinger.display_name}
                  </p>
                  <p className="mt-2 text-xs text-[#8f6c65]">
                    {formatLeadSingerMeta(leadSinger)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          className={adminSectionCardClassName(
            "relative min-h-0 overflow-hidden",
          )}
        >
          {(message || saveState === "saving") && !error ? (
            <div className="pointer-events-none absolute right-5 top-5 z-10">
              <div className="rounded-[var(--theme-radius-surface)] border border-[#dce7cd] bg-[#f7fbf1]/95 px-3 py-2 text-sm text-[color:var(--theme-player-green)] shadow-[0_12px_26px_rgba(121,161,79,0.14)] backdrop-blur-sm">
                {saveState === "saving" ? "Saving lead singer..." : message}
              </div>
            </div>
          ) : null}
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 p-5">
              {error ? (
                <div className="mb-4 rounded-[var(--theme-radius-surface)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                  {error}
                </div>
              ) : null}

              {selected ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-[0.92rem] uppercase tracking-[0.2em] text-[#b07f70]">
                        Selected Lead Singer
                      </p>
                      <h3 className="mt-2 font-display text-[2rem] leading-none text-[#5d433c]">
                        {selected.display_name}
                      </h3>
                      <p className="mt-3 text-sm text-[#8f6c65]">
                        {formatLeadSingerMeta(selected)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!hasUnsavedChanges || saveState === "saving"}
                        onClick={() => void saveLeadSinger()}
                        className={`${adminPrimaryButtonClassName()} disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        {saveState === "saving" ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLeadSinger()}
                        className={adminDangerButtonClassName()}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div
              ref={detailScrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"
            >
              {selected ? (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className={adminSectionCardClassName("bg-white/75 p-5")}>
                    <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                      Base Record
                    </h4>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={adminDetailFieldLabelClassName()}>
                          Display name
                        </label>
                        <input
                          value={displayName}
                          onChange={(event) =>
                            setDisplayName(event.target.value)
                          }
                          className={`${adminFieldClassName()} mt-1`}
                        />
                      </div>
                      <div>
                        <label className={adminDetailFieldLabelClassName()}>
                          Canonical name
                        </label>
                        <input
                          value={canonicalName}
                          onChange={(event) =>
                            setCanonicalName(event.target.value)
                          }
                          className={`${adminFieldClassName()} mt-1`}
                        />
                      </div>
                      <div>
                        <label className={adminDetailFieldLabelClassName()}>
                          Slug
                        </label>
                        <input
                          value={slug}
                          onChange={(event) => setSlug(event.target.value)}
                          className={`${adminFieldClassName()} mt-1`}
                        />
                      </div>
                      <div>
                        <label className={adminDetailFieldLabelClassName()}>
                          Home sanga
                        </label>
                        <select
                          value={homeSangaId}
                          onChange={(event) =>
                            setHomeSangaId(event.target.value)
                          }
                          className={`${adminFieldClassName()} mt-1`}
                        >
                          <option value="">None</option>
                          {sangaOptions.map((sanga) => (
                            <option key={sanga.id} value={sanga.id}>
                              {sanga.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={adminDetailFieldLabelClassName()}>
                          Priority
                        </label>
                        <input
                          value={priority}
                          onChange={(event) => setPriority(event.target.value)}
                          className={`${adminFieldClassName()} mt-1`}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mt-1 flex items-center gap-2 text-sm text-[#75584d]">
                          <input
                            type="checkbox"
                            checked={isIdentified}
                            onChange={(event) =>
                              setIsIdentified(event.target.checked)
                            }
                          />
                          Show this lead singer in Explore
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={adminDetailFieldLabelClassName()}>
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          rows={4}
                          className={`${adminFieldClassName()} mt-1`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <p className={adminDetailFieldLabelClassName()}>ID</p>
                        <div className="mt-1 rounded-[var(--theme-radius-surface)] border border-[#efe2da] bg-[#faf3ee] px-3 py-2 text-sm text-[#87645c]">
                          {selected.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div
                      className={adminSectionCardClassName("bg-white/75 p-5")}
                    >
                      <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                        Portrait
                      </h4>
                      <div className="mt-4 space-y-4">
                        <div>
                          <input
                            type="file"
                            accept={ADMIN_LEAD_SINGER_IMAGE_ACCEPT}
                            onChange={(event) =>
                              setImageFile(event.target.files?.[0] ?? null)
                            }
                            className={`${adminFieldClassName()} py-2`}
                          />

                          {selected.image_key ? (
                            <p className="mt-2 break-all text-xs text-[#8f6c65]">
                              Current key: {selected.image_key}
                            </p>
                          ) : null}
                        </div>
                        <LeadSingerPortraitFocusControl
                          title="Crop focus"
                          helperText="Click the portrait or use the sliders to keep the face centered inside the circular crop."
                          name={displayName || selected.display_name}
                          imageUrl={previewImageUrl}
                          alt={selected.image_alt}
                          focusX={imageFocusX}
                          focusY={imageFocusY}
                          onChange={(nextFocusX, nextFocusY) => {
                            setImageFocusX(nextFocusX);
                            setImageFocusY(nextFocusY);
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className={adminSectionCardClassName("bg-white/75 p-5")}
                    >
                      <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                        Linked Kirtans
                      </h4>
                      {linkedKirtanState.kirtans.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {linkedKirtanState.kirtans.map((kirtan) => (
                            <Link
                              key={kirtan.id}
                              href={`/admin/kirtans?selected=${encodeURIComponent(kirtan.id)}`}
                              className="block rounded-[var(--theme-radius-surface)] border border-[#efe2da] bg-[#fff9f5] px-3 py-3 transition hover:border-[color:var(--theme-page-home-discovery-gold)] hover:bg-white"
                            >
                              <p className="font-medium text-[#5d433c]">
                                {kirtan.title}
                              </p>
                              <p className="mt-1 text-xs text-[#8f6c65]">
                                {[
                                  formatKirtanTypeLabel(
                                    kirtan.type,
                                    kirtan.sequence_num,
                                  ),
                                  kirtan.recorded_date,
                                  kirtan.published
                                    ? "Published"
                                    : "Unpublished",
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                            </Link>
                          ))}
                          {isLoadingMoreKirtans ? (
                            <div className="rounded-[var(--theme-radius-surface)] border border-dashed border-[#e5d7cf] bg-white/88 px-4 py-3 text-center text-sm text-[#95786a]">
                              Loading more kirtans...
                            </div>
                          ) : null}
                          {linkedKirtanState.has_more ? (
                            <div
                              ref={kirtanLoadMoreRef}
                              className="h-3 w-full"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-relaxed text-[#8c6a63]">
                          No kirtans are currently linked to this lead singer.
                        </p>
                      )}
                      <p className="mt-3 text-xs text-[#8f6c65]">
                        Showing {linkedKirtanState.kirtans.length} of{" "}
                        {linkedKirtanState.total_count} linked kirtans.
                      </p>
                    </div>

                    <div
                      className={adminSectionCardClassName("bg-white/75 p-5")}
                    >
                      <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                        Delete Impact
                      </h4>
                      <p className="mt-3 text-sm leading-relaxed text-[#8c6a63]">
                        Lead singers can only be deleted after their linked
                        kirtans have been reassigned.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[480px] items-center justify-center rounded-[var(--theme-radius-surface)] border border-dashed border-[color:var(--theme-page-home-discovery-gold)] bg-white/55 px-6 text-center text-[#8f6c65]">
                  Select a lead singer from the list to edit it.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(78,51,41,0.28)] px-4 backdrop-blur-sm">
          <div className={adminSectionCardClassName("w-full max-w-2xl p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={adminPanelHeadingClassName()}>
                  New Lead Singer
                </h3>
                <p className={adminPanelDescriptionClassName()}>
                  Create a lead singer record and optionally upload the first
                  portrait.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className={adminSecondaryButtonClassName()}
              >
                Close
              </button>
            </div>

            {error && createState === "error" ? (
              <div className="mt-4 rounded-[var(--theme-radius-surface)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={adminDetailFieldLabelClassName()}>
                  Display name
                </label>
                <input
                  value={newDisplayName}
                  onChange={(event) => setNewDisplayName(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                />
              </div>
              <div>
                <label className={adminDetailFieldLabelClassName()}>
                  Canonical name
                </label>
                <input
                  value={newCanonicalName}
                  onChange={(event) => setNewCanonicalName(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                />
              </div>
              <div>
                <label className={adminDetailFieldLabelClassName()}>Slug</label>
                <input
                  value={newSlug}
                  onChange={(event) => setNewSlug(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                />
              </div>
              <div>
                <label className={adminDetailFieldLabelClassName()}>
                  Home sanga
                </label>
                <select
                  value={newHomeSangaId}
                  onChange={(event) => setNewHomeSangaId(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                >
                  <option value="">None</option>
                  {sangaOptions.map((sanga) => (
                    <option key={sanga.id} value={sanga.id}>
                      {sanga.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={adminDetailFieldLabelClassName()}>
                  Priority
                </label>
                <input
                  value={newPriority}
                  onChange={(event) => setNewPriority(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                  inputMode="numeric"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mt-1 flex items-center gap-2 text-sm text-[#75584d]">
                  <input
                    type="checkbox"
                    checked={newIsIdentified}
                    onChange={(event) =>
                      setNewIsIdentified(event.target.checked)
                    }
                  />
                  Show this lead singer in Explore
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={adminDetailFieldLabelClassName()}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  rows={4}
                  className={`${adminFieldClassName()} mt-1`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={adminDetailFieldLabelClassName()}>
                  Portrait image
                </label>
                <div className="mt-1 flex items-start gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-full bg-[#f7ece5]">
                    <LeadSingerAvatar
                      name={newDisplayName || "New lead singer"}
                      imageUrl={newImagePreviewUrl}
                      alt={newDisplayName || "New lead singer"}
                      focusX={newImageFocusX}
                      focusY={newImageFocusY}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept={ADMIN_LEAD_SINGER_IMAGE_ACCEPT}
                      onChange={(event) =>
                        setNewImageFile(event.target.files?.[0] ?? null)
                      }
                      className={`${adminFieldClassName()} py-2`}
                    />
                    <p className="mt-2 text-xs text-[#8f6c65]">
                      Uploads go to `images/lead-singers/` and use the lead
                      singer name in the filename.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <LeadSingerPortraitFocusControl
                    title="Initial crop focus"
                    helperText="Set the portrait crop now so the public pages use a better default immediately."
                    name={newDisplayName || "New lead singer"}
                    imageUrl={newImagePreviewUrl}
                    alt={newDisplayName || "New lead singer"}
                    focusX={newImageFocusX}
                    focusY={newImageFocusY}
                    onChange={(nextFocusX, nextFocusY) => {
                      setNewImageFocusX(nextFocusX);
                      setNewImageFocusY(nextFocusY);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className={adminSecondaryButtonClassName()}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createLeadSinger()}
                className={adminPrimaryButtonClassName()}
              >
                {createState === "saving"
                  ? "Creating..."
                  : "Create lead singer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
