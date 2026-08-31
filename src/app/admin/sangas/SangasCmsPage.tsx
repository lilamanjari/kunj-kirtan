"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { AdminSangaDetail, AdminSangaSummary } from "@/lib/admin/types";
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

type SaveState = "idle" | "saving" | "saved" | "error";

function usageSummaryLabel(
  sanga: Pick<AdminSangaSummary, "kirtan_count" | "lead_singer_count">,
) {
  const parts = [
    `${sanga.kirtan_count} ${sanga.kirtan_count === 1 ? "kirtan" : "kirtans"}`,
    `${sanga.lead_singer_count} ${sanga.lead_singer_count === 1 ? "lead singer" : "lead singers"}`,
  ];
  return parts.join(" • ");
}

export function SangasCmsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sangas, setSangas] = useState<AdminSangaSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminSangaDetail | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSangaName, setNewSangaName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [createState, setCreateState] = useState<SaveState>("idle");

  const loadSangas = useCallback(
    async (nextSelectedId?: string | null) => {
      setListError(null);
      const params = new URLSearchParams();
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());

      const response = await fetch(`/api/admin/sangas?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load sangas");
      }

      const nextSangas = (json.sangas ?? []) as AdminSangaSummary[];
      setSangas(nextSangas);
      setSelectedId((current) => {
        const target = nextSelectedId ?? current;
        if (target && nextSangas.some((sanga) => sanga.id === target))
          return target;
        return nextSangas[0]?.id ?? null;
      });
    },
    [deferredSearch],
  );

  const loadSelected = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/sangas/${id}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Failed to load sanga");
    }

    const sanga = json.sanga as AdminSangaDetail;
    setSelected(sanga);
    setName(sanga.name);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadSangas();
      } catch (loadError) {
        if (!cancelled) {
          setListError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load sangas",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadSangas]);

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
              : "Failed to load sanga",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadSelected, selectedId]);

  async function saveSanga() {
    if (!selected) return;
    setError(null);
    setMessage(null);
    setSaveState("saving");

    const response = await fetch(`/api/admin/sangas/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to save sanga");
      setSaveState("error");
      return;
    }

    setMessage("Sanga saved.");
    setSaveState("saved");
    await loadSangas(selected.id);
    await loadSelected(selected.id);
  }

  async function createSanga() {
    const trimmed = newSangaName.trim();
    if (!trimmed) {
      setError("Name is required");
      return false;
    }

    setError(null);
    setMessage(null);
    setCreateState("saving");

    const response = await fetch("/api/admin/sangas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create sanga");
      setCreateState("error");
      return false;
    }

    setMessage("Sanga created.");
    setCreateState("saved");
    setNewSangaName("");
    await loadSangas(json.id);
    return true;
  }

  async function deleteSanga() {
    if (!selected) return;

    const confirmed = window.confirm(
      `This will unlink ${selected.kirtan_count} kirtans and ${selected.lead_singer_count} lead singers from ${selected.name}. This action cannot be undone. Delete anyway?`,
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setSaveState("saving");

    const response = await fetch(`/api/admin/sangas/${selected.id}`, {
      method: "DELETE",
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to delete sanga");
      setSaveState("error");
      return;
    }

    setMessage("Sanga deleted.");
    setSaveState("saved");
    setSelected(null);
    await loadSangas(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <section
          className={adminSectionCardClassName(
            "flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-0",
          )}
        >
          <div className="px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={adminPanelHeadingClassName()}>Sangas</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setCreateState("idle");
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
                placeholder="Search sangas"
                className={adminFieldClassName()}
              />
              <p className="text-sm text-[#9f7c72]">Count: {sangas.length}</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {listError ? (
              <div className="mx-2 mb-2 rounded-[var(--theme-radius-surface)] border border-[#efc7c0] bg-[#fff4f3] px-3 py-2 text-sm text-[#a45e5a]">
                {listError}
              </div>
            ) : null}
            {sangas.map((sanga) => (
              <button
                key={sanga.id}
                type="button"
                onClick={() => {
                  setMessage(null);
                  setError(null);
                  setSaveState("idle");
                  setSelectedId(sanga.id);
                }}
                className={[
                  "mb-2 w-full rounded-[var(--theme-radius-surface)] border px-4 py-3 text-left transition",
                  selectedId === sanga.id
                    ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)]/60 shadow-[0_14px_30px_rgba(121,161,79,0.16)]"
                    : "border-transparent bg-white/72 hover:border-[color:var(--theme-page-home-discovery-gold)] hover:bg-white/90",
                ].join(" ")}
              >
                <p className="font-display text-[1.05rem] leading-none text-[#5d433c]">
                  {sanga.name}
                </p>
                <p className="mt-2 text-xs text-[#8f6c65]">
                  {usageSummaryLabel(sanga)}
                </p>
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
                {saveState === "saving" ? "Saving sanga..." : message}
              </div>
            </div>
          ) : null}
          <div className="p-5">
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
                      Selected Sanga
                    </p>
                    <h3 className="mt-2 font-display text-[2rem] leading-none text-[#5d433c]">
                      {selected.name}
                    </h3>
                    <p className="mt-3 text-sm text-[#8f6c65]">
                      {usageSummaryLabel(selected)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveSanga()}
                      className={adminPrimaryButtonClassName()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSanga()}
                      className={adminDangerButtonClassName()}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className={adminSectionCardClassName("bg-white/75 p-5")}>
                    <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                      Base Record
                    </h4>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={adminDetailFieldLabelClassName()}>
                          Name
                        </label>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
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
                        Linked Usage
                      </h4>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className={adminDetailFieldLabelClassName()}>
                            Kirtans
                          </p>
                          <p className="mt-1 text-sm text-[#6f5449]">
                            {selected.kirtan_count}
                          </p>
                        </div>
                        <div>
                          <p className={adminDetailFieldLabelClassName()}>
                            Lead singers
                          </p>
                          <p className="mt-1 text-sm text-[#6f5449]">
                            {selected.lead_singer_count}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={adminSectionCardClassName("bg-white/75 p-5")}
                    >
                      <h4 className="font-display text-[0.95rem] uppercase tracking-[0.18em] text-[#a47d6d]">
                        Delete Impact
                      </h4>
                      <p className="mt-3 text-sm leading-relaxed text-[#8c6a63]">
                        Deleting this sanga will clear it from linked kirtans
                        and lead singers before removing the record. This action
                        is irreversible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[480px] items-center justify-center rounded-[var(--theme-radius-surface)] border border-dashed border-[color:var(--theme-page-home-discovery-gold)] bg-white/55 px-6 text-center text-[#8f6c65]">
                Select a sanga from the list to edit it.
              </div>
            )}
          </div>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(78,51,41,0.28)] px-4 backdrop-blur-sm">
          <div className={adminSectionCardClassName("w-full max-w-lg p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={adminPanelHeadingClassName()}>New Sanga</h3>
                <p className={adminPanelDescriptionClassName()}>
                  Create a new sanga record for kirtans and lead singers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
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

            <div className="mt-5 space-y-4">
              <div>
                <label className={adminDetailFieldLabelClassName()}>Name</label>
                <input
                  value={newSangaName}
                  onChange={(event) => setNewSangaName(event.target.value)}
                  className={`${adminFieldClassName()} mt-1`}
                  placeholder="Enter sanga name"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateState("idle");
                  setNewSangaName("");
                }}
                className={adminSecondaryButtonClassName()}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const created = await createSanga();
                  if (created) {
                    setIsCreateModalOpen(false);
                    setCreateState("idle");
                  }
                }}
                className={adminPrimaryButtonClassName()}
              >
                {createState === "saving" ? "Creating..." : "Create sanga"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
