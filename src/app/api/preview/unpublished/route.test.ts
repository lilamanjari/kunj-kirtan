import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  hasAccess: vi.fn(),
  validPassphrase: vi.fn(),
  createToken: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/server/unpublishedPreview", () => ({
  createUnpublishedPreviewToken: mocks.createToken,
  hasUnpublishedPreviewAccess: mocks.hasAccess,
  isUnpublishedPreviewConfigured: mocks.configured,
  isValidUnpublishedPreviewPassphrase: mocks.validPassphrase,
  UNPUBLISHED_PREVIEW_COOKIE: "kk_unpublished_preview",
  UNPUBLISHED_PREVIEW_TTL_SECONDS: 2_592_000,
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import { DELETE, GET, POST } from "./route";

describe("unpublished preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.hasAccess.mockResolvedValue(false);
    mocks.validPassphrase.mockReturnValue(false);
    mocks.createToken.mockReturnValue("signed-preview-token");
    const query = { select: mocks.select, eq: mocks.eq, order: mocks.order, limit: mocks.limit };
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.order.mockReturnValue(query);
    mocks.limit.mockResolvedValue({ data: [], error: null });
  });

  it("does not return unpublished content to a locked client", async () => {
    const response = await GET();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns only unpublished rows and marks them private when unlocked", async () => {
    mocks.hasAccess.mockResolvedValue(true);
    mocks.limit.mockResolvedValue({
      data: [{
        id: "hidden-1",
        type: "MM",
        title: "Hidden mantra",
        recorded_date: null,
        recorded_date_precision: null,
        sequence_num: 3,
        lead_singer_id: null,
        lead_singers: null,
        sangas: { name: "Vrindavan" },
        audio_files: [{ file_url: "https://audio.example/hidden.mp3", duration_seconds: 120, is_current: true }],
        kirtan_titles: [],
      }],
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.from).toHaveBeenCalledWith("kirtans");
    expect(mocks.eq).toHaveBeenCalledWith("published", false);
    expect(body.kirtans).toHaveLength(1);
    expect(body.kirtans[0]).toMatchObject({ id: "hidden-1", private_preview: true });
  });

  it("issues a private preview cookie only for a valid passphrase", async () => {
    mocks.validPassphrase.mockReturnValue(true);
    const response = await POST(new Request("http://localhost/api/preview/unpublished", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase: "owner-only" }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("kk_unpublished_preview=signed-preview-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects a wrong passphrase and clears the cookie when locked", async () => {
    const rejected = await POST(new Request("http://localhost/api/preview/unpublished", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase: "wrong" }),
    }));
    const cleared = await DELETE();

    expect(rejected.status).toBe(401);
    expect(rejected.headers.get("set-cookie")).toBeNull();
    expect(cleared.status).toBe(200);
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
