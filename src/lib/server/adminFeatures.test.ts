import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/server/homeFeaturedItem", () => ({ HOME_CURRENT_VRATA_SLOT: "home_current_vrata" }));
import { saveFeature } from "./adminFeatures";

function builder(data: unknown, error: { message: string } | null = null) {
  const result = { data, error };
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result), single: vi.fn().mockResolvedValue(result),
    then: (resolve: (result: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
}
const tagId = "12345678-1234-1234-1234-123456789abc";
const body = { occasionId: tagId, title: "Festival", subtitle: "Come sing", startsAt: "2090-10-26T10:00:00Z", endsAt: "2090-11-26T10:00:00Z" };
const tag = { id: tagId, name: "Festival", published: true, slug: "festival" };
function setup(features: unknown[] = [], published = true) {
  const write = builder({ id: "saved-id" });
  mocks.from.mockReturnValueOnce(builder({ ...tag, published }))
    .mockReturnValueOnce(builder(features)).mockReturnValueOnce(builder([tag])).mockReturnValueOnce(write);
  return write;
}
beforeEach(() => vi.resetAllMocks());
describe("saving homepage features", () => {
  it("creates the supported slot with hidden defaults and UTC instants", async () => {
    const write = setup();
    expect(await saveFeature(body)).toBe("saved-id");
    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({
      slot: "home_current_vrata", sort_order: 100, entity_table: "tags", entity_id: tagId,
      is_active: true, title_override: "Festival", subtitle: "Come sing", starts_at: "2090-10-26T10:00:00.000Z",
    }));
  });
  it("rejects an unpublished Occasion before writing", async () => {
    setup([], false);
    await expect(saveFeature(body)).rejects.toThrow("Publish this Occasion");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    { startsAt: "2090-10-26T10:00", endsAt: "2090-11-26T10:00" },
    { endsAt: "2090-10-26T10:00:00Z" },
    { endsAt: "2020-01-01T00:00:00Z" },
    { title: "" }, { occasionId: "bad" },
  ])("rejects invalid input without writing: %o", async (invalid) => {
    await expect(saveFeature({ ...body, ...invalid })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects overlapping periods instead of saving an invisible feature", async () => {
    const write = setup([{ id: "other", entity_id: tagId, entity_table: "tags", is_active: true, starts_at: body.startsAt, ends_at: body.endsAt, title_override: "Existing festival" }]);
    await expect(saveFeature(body)).rejects.toThrow("overlaps");
    expect(write.insert).not.toHaveBeenCalled();
  });
  it("allows editing the same feature and adjacent schedules", async () => {
    const id = "abcdef12-1234-1234-1234-123456789abc";
    const write = setup([
      { id, entity_id: tagId, entity_table: "tags", is_active: true, starts_at: body.startsAt, ends_at: body.endsAt },
      { id: "previous", entity_id: tagId, entity_table: "tags", is_active: true, starts_at: null, ends_at: body.startsAt },
    ]);
    await expect(saveFeature({ ...body, id })).resolves.toBe("saved-id");
    expect(write.update).toHaveBeenCalled();
    expect(write.eq).toHaveBeenCalledWith("id", id);
  });
});
