"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { AdminTagDetail, AdminTagSummary } from "@/lib/admin/types";

function sectionCardClassName(extra = "") {
  return `rounded-[var(--theme-radius-surface)] border border-[#edd8ce] bg-[rgba(255,250,246,0.92)] shadow-[0_20px_44px_rgba(170,118,91,0.12)] ${extra}`.trim();
}

function fieldClassName() {
  return "w-full rounded-[var(--theme-radius-card)] border border-[#e8d4cb] bg-white/90 px-3 py-2 text-sm text-[#5d433c] outline-none transition focus:border-[color:var(--theme-player-green)] focus:ring-2 focus:ring-[color:var(--theme-player-green-soft)]";
}

export function TagsCmsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const deferredSearch = useDeferredValue(search);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<AdminTagSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminTagDetail | null>(null);
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("occasion");
  const [published, setPublished] = useState(true);
  const [browseVisible, setBrowseVisible] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("occasion");
  const [newTagPublished, setNewTagPublished] = useState(true);
  const [newTagBrowseVisible, setNewTagBrowseVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadTags = useCallback(
    async (nextSelectedId?: string | null) => {
      const params = new URLSearchParams();
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (category !== "all") params.set("category", category);

      const response = await fetch(`/api/admin/tags?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load tags");
      }

      const nextTags = (json.tags ?? []) as AdminTagSummary[];
      setTags(nextTags);
      setCategories((json.categories ?? []) as string[]);
      setSelectedId((current) => {
        const target = nextSelectedId ?? current;
        if (target && nextTags.some((tag) => tag.id === target)) return target;
        return nextTags[0]?.id ?? null;
      });
    },
    [category, deferredSearch],
  );

  const loadSelected = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/tags/${id}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to load tag");
    }

    const tag = json.tag as AdminTagDetail;
    setSelected(tag);
    setName(tag.name);
    setSelectedCategory(tag.category);
    setPublished(tag.published);
    setBrowseVisible(tag.browse_visible);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadTags();
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load tags",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadTags]);

  useEffect(() => {
    if (!selectedId) return;
    const currentId = selectedId;

    let cancelled = false;

    async function run() {
      try {
        await loadSelected(currentId);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load tag",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadSelected, selectedId]);

  async function saveTag() {
    if (!selected) return;
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/tags/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: selectedCategory,
        published,
        browse_visible: published ? browseVisible : false,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to save tag");
      return;
    }

    setMessage("Tag saved.");
    await loadTags(selected.id);
    await loadSelected(selected.id);
  }

  async function createTag() {
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTagName,
        category: newTagCategory,
        published: newTagPublished,
        browse_visible: newTagPublished ? newTagBrowseVisible : false,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create tag");
      return false;
    }

    setMessage("Tag created.");
    setNewTagName("");
    setNewTagPublished(true);
    setNewTagBrowseVisible(false);
    await loadTags(json.id);
    return true;
  }

  async function deleteTag() {
    if (!selected) return;

    const confirmed = window.confirm(
      `This tag is linked to ${selected.usage_count} kirtans. Do you want to unlink all and delete?`,
    );
    if (!confirmed) return;

    const response = await fetch(`/api/admin/tags/${selected.id}`, {
      method: "DELETE",
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to delete tag");
      return;
    }

    setMessage("Tag deleted.");
    setSelected(null);
    await loadTags(null);
  }

  return (
    <>
      <div className="grid h-[calc(100vh-8.5rem)] min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(320px,420px)_1fr]">
        <section
          className={sectionCardClassName(
            "flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <div className="border-b border-[#f0ddd3] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Tags</h2>
                <p className="mt-1 text-sm text-[#8c6a63]">
                  Browse the tag library and open one tag at a time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="shrink-0 whitespace-nowrap rounded-[var(--theme-radius-button)] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(121,161,79,0.28)]"
              >
                New tag
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tags"
                className={fieldClassName()}
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={fieldClassName()}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedId(tag.id)}
                className={[
                  "mb-2 w-full rounded-[var(--theme-radius-card)] border p-3 text-left transition",
                  selectedId === tag.id
                    ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)]/60 shadow-[0_12px_28px_rgba(121,161,79,0.16)]"
                    : "border-transparent bg-white/70 hover:border-[#ead3c8] hover:bg-white",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-[#5f4338]">
                  {tag.name}
                </p>
                <p className="mt-1 text-xs text-[#8f6c65]">
                  {tag.category} • {tag.usage_count} linked
                </p>
                <p className="mt-1 text-[11px] text-[#a07a6e]">
                  {tag.published ? "published" : "unpublished"} •{" "}
                  {tag.browse_visible ? "browse visible" : "hidden from browse"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section
          className={sectionCardClassName("min-h-0 overflow-hidden px-5 py-5")}
        >
          {error ? (
            <div className="mb-4 rounded-[var(--theme-radius-card)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-[var(--theme-radius-card)] border border-[#dce7cd] bg-[#f7fbf1] px-3 py-2 text-sm text-[color:var(--theme-player-green)]">
              {message}
            </div>
          ) : null}

          <div className="h-full min-h-0 rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-white/75 p-4">
            {selected ? (
              <>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a47d6d]">
                  Selected tag
                </h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                      Name
                    </label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={fieldClassName()}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                      Slug
                    </label>
                    <div className="rounded-[var(--theme-radius-card)] border border-[#efe2da] bg-[#faf3ee] px-3 py-2 text-sm text-[#87645c]">
                      {selected.slug}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
                      className={fieldClassName()}
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-[#fffdfa] px-3 py-3 text-sm text-[#6b514a]">
                      <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                        Published
                      </span>
                      <input
                        type="checkbox"
                        checked={published}
                        onChange={(event) => {
                          const nextPublished = event.target.checked;
                          setPublished(nextPublished);
                          if (!nextPublished) {
                            setBrowseVisible(false);
                          }
                        }}
                      />
                    </label>
                    <label className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-[#fffdfa] px-3 py-3 text-sm text-[#6b514a]">
                      <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                        Browse visible
                      </span>
                      <input
                        type="checkbox"
                        checked={published && browseVisible}
                        disabled={!published}
                        onChange={(event) =>
                          setBrowseVisible(event.target.checked)
                        }
                      />
                    </label>
                  </div>
                  <p className="text-xs text-[#9a786f]">
                    Only published tags can be visible in browse lists like
                    Occasions.
                  </p>
                  <p className="text-sm text-[#8d6b64]">
                    {selected.usage_count} linked kirtans
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => void saveTag()}
                      className="rounded-[var(--theme-radius-button)] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(121,161,79,0.28)]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteTag()}
                      className="rounded-[var(--theme-radius-button)] border border-[#efc7c0] bg-[#fff4f3] px-4 py-2 text-sm font-medium text-[#a45e5a]"
                    >
                      Delete tag
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center text-center text-[#8d6b64]">
                Select a tag to edit it.
              </div>
            )}
          </div>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(78,52,41,0.26)] px-4">
          <div className="w-full max-w-xl rounded-[var(--theme-radius-surface)] border border-[#edd8ce] bg-[rgba(255,250,246,0.98)] p-5 shadow-[0_24px_64px_rgba(119,79,58,0.22)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#b18472]">
                  New Tag
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[#5f4338]">
                  Create a tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-[var(--theme-radius-button)] border border-[#ead6cb] bg-white/80 px-3 py-1.5 text-sm text-[#8f6c65]"
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Tag name"
                className={fieldClassName()}
              />
              <select
                value={newTagCategory}
                onChange={(event) => setNewTagCategory(event.target.value)}
                className={fieldClassName()}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                {!categories.includes("occasion") ? (
                  <option value="occasion">occasion</option>
                ) : null}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-[#fffdfa] px-3 py-3 text-sm text-[#6b514a]">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                    Published
                  </span>
                  <input
                    type="checkbox"
                    checked={newTagPublished}
                    onChange={(event) => {
                      const nextPublished = event.target.checked;
                      setNewTagPublished(nextPublished);
                      if (!nextPublished) {
                        setNewTagBrowseVisible(false);
                      }
                    }}
                  />
                </label>
                <label className="rounded-[var(--theme-radius-card)] border border-[#eedbd0] bg-[#fffdfa] px-3 py-3 text-sm text-[#6b514a]">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#a47d6d]">
                    Browse visible
                  </span>
                  <input
                    type="checkbox"
                    checked={newTagPublished && newTagBrowseVisible}
                    disabled={!newTagPublished}
                    onChange={(event) =>
                      setNewTagBrowseVisible(event.target.checked)
                    }
                  />
                </label>
              </div>
              <p className="text-xs text-[#9a786f]">
                Only published tags can be visible in browse lists.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const created = await createTag();
                    if (created) {
                      setIsCreateModalOpen(false);
                    }
                  }}
                  className="rounded-[var(--theme-radius-button)] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(121,161,79,0.28)]"
                >
                  Add tag
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-[var(--theme-radius-button)] border border-[#ead6cb] bg-white/80 px-4 py-2 text-sm font-medium text-[#8f6c65]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
