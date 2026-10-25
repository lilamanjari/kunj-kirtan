import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), detail: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/admin/data", () => ({ getAdminKirtanDetail: mocks.detail }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateCmsAndPublicContent: mocks.revalidate }));
vi.mock("@/lib/server/r2KirtanAudio", () => ({ deleteAudioFromR2: vi.fn(), getStorageKeyFromAudioUrl: vi.fn() }));

import { PATCH } from "./route";

const singerId = "12345678-1234-1234-1234-123456789abc";
function query(data: unknown, error: { message: string } | null = null) {
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}
function patch(body: unknown) {
  return PATCH(new Request("http://localhost/api/admin/kirtans/bhajan-1", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: "bhajan-1" }) });
}

describe("changing a bhajan's lead singer", () => {
  beforeEach(() => vi.resetAllMocks());

  it("persists the singer, leaves titles/audio alone, and invalidates public content", async () => {
    const existing = query({ id: "bhajan-1", type: "BHJ" });
    const singer = query({ id: singerId });
    const updated = query({ id: "bhajan-1" });
    mocks.from.mockReturnValueOnce(existing).mockReturnValueOnce(singer).mockReturnValueOnce(updated);
    const detail = { id: "bhajan-1", lead_singer_id: singerId, lead_singer: "Correct singer" };
    mocks.detail.mockResolvedValue(detail);
    const response = await patch({ leadSingerId: singerId });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, kirtan: detail });
    expect(updated.update).toHaveBeenCalledWith({ lead_singer_id: singerId, updated_at: expect.any(String) });
    expect(updated.eq).toHaveBeenCalledWith("type", "BHJ");
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(["kirtans", "lead_singers", "kirtans"]);
    expect(mocks.revalidate).toHaveBeenCalledOnce();
  });

  it.each([null, "", "bad-id", 123])("rejects invalid singer ID %s", async (leadSingerId) => {
    expect((await patch({ leadSingerId })).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects combined edits", async () => {
    expect((await patch({ leadSingerId: singerId, type: "MM" })).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["MM", "HK"])("does not reassign a %s recording", async (type) => {
    mocks.from.mockReturnValue(query({ id: "bhajan-1", type }));
    expect((await patch({ leadSingerId: singerId })).status).toBe(400);
    expect(mocks.from).toHaveBeenCalledOnce();
  });

  it("handles a missing recording", async () => {
    mocks.from.mockReturnValue(query(null));
    expect((await patch({ leadSingerId: singerId })).status).toBe(404);
  });

  it("rejects a singer that no longer exists", async () => {
    mocks.from.mockReturnValueOnce(query({ id: "bhajan-1", type: "BHJ" })).mockReturnValueOnce(query(null));
    expect((await patch({ leadSingerId: singerId })).status).toBe(400);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("handles the recording changing type before the update", async () => {
    mocks.from.mockReturnValueOnce(query({ id: "bhajan-1", type: "BHJ" }))
      .mockReturnValueOnce(query({ id: singerId })).mockReturnValueOnce(query(null));
    expect((await patch({ leadSingerId: singerId })).status).toBe(409);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("reports save failures without claiming success", async () => {
    mocks.from.mockReturnValueOnce(query({ id: "bhajan-1", type: "BHJ" }))
      .mockReturnValueOnce(query({ id: singerId })).mockReturnValueOnce(query(null, { message: "Database unavailable" }));
    const response = await patch({ leadSingerId: singerId });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Database unavailable" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
