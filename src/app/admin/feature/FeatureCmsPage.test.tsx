// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeatureCmsPage from "./FeatureCmsPage";
import { toLocalDateTime, oneMonthAfter } from "@/lib/admin/features";

vi.mock("./DateTimePicker", () => ({ default: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const tag = { id: "tag-1", name: "Ekadasi", description: "A day of devotion", slug: "ekadasi", published: true };
const current = { id: "feature-1", entity_table: "tags", entity_id: tag.id, title_override: "Current festival", subtitle: "An invitation", starts_at: null, ends_at: null, is_active: true, entity_name: "Ekadasi" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

describe("Feature workflow", () => {
  it("shows an existing live feature and hides database controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ features: [current], occasions: [tag] })));
    render(<FeatureCmsPage />);
    expect(await screen.findByText("Current festival")).toBeTruthy();
    expect(screen.getByText("Currently Featured")).toBeTruthy();
    expect(screen.queryByLabelText(/slot|sort order/i)).toBeNull();
    expect(screen.queryByText("New feature")).toBeTruthy();
  });
  it("defaults a new feature to the Occasion copy, now and one month ahead", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ features: [], occasions: [tag] })));
    render(<FeatureCmsPage />);
    fireEvent.change(await screen.findByLabelText("What would you like to feature?"), { target: { value: tag.id } });
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(tag.name);
    expect((screen.getByLabelText("Subtitle") as HTMLTextAreaElement).value).toBe(tag.description);
    expect((screen.getByLabelText("Start at") as HTMLInputElement).value).toBe(toLocalDateTime(new Date()));
    expect((screen.getByLabelText("Ends at") as HTMLInputElement).value).toBe(toLocalDateTime(oneMonthAfter(new Date())));
  });
  it("shows the saved feature, then revalidates and warms in separate requests", async () => {
    const stages: string[] = [];
    let saved = false;
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/refresh")) {
        stages.push(JSON.parse(String(init?.body)).stage); return json({ ok: true });
      }
      if (init?.method === "POST") { saved = true; stages.push("save"); return json({ id: "feature-1" }); }
      return json({ features: saved ? [{ ...current, title_override: tag.name }] : [], occasions: [tag] });
    });
    vi.stubGlobal("fetch", fetch);
    render(<FeatureCmsPage />);
    fireEvent.change(await screen.findByLabelText("What would you like to feature?"), { target: { value: tag.id } });
    fireEvent.click(screen.getByRole("button", { name: "Feature this Occasion" }));
    await screen.findByText("Saved · Homepage refreshed and ready.");
    expect(stages).toEqual(["save", "revalidate", "warm"]);
    expect(screen.getByRole("heading", { name: "Ekadasi" })).toBeTruthy();
    const payload = JSON.parse(String(fetch.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body));
    expect(payload.startsAt).toMatch(/Z$/);
  });
  it("retains the saved feature and offers a refresh retry when warming fails", async () => {
    let saved = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/refresh")) return JSON.parse(String(init?.body)).stage === "warm" ? json({ error: "Cache unavailable" }, 503) : json({ ok: true });
      if (init?.method === "POST") { saved = true; return json({ id: "feature-1" }); }
      return json({ features: saved ? [current] : [], occasions: [tag] });
    }));
    render(<FeatureCmsPage />);
    fireEvent.change(await screen.findByLabelText("What would you like to feature?"), { target: { value: tag.id } });
    fireEvent.click(screen.getByRole("button", { name: "Feature this Occasion" }));
    await waitFor(() => expect(screen.getByText(/Your change is saved/)).toBeTruthy());
    expect(screen.getByText("Current festival")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry homepage refresh" })).toBeTruthy();
  });
});
