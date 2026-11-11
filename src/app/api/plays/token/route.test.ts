import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ maybeSingle: vi.fn(), previewAccess: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  },
}));
vi.mock("@/lib/server/unpublishedPreview", () => ({ hasUnpublishedPreviewAccess: mocks.previewAccess }));

describe("GET /api/plays/token", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalPlaybackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.PLAYBACK_TOKEN_SECRET = "test-playback-secret";
    mocks.maybeSingle.mockReset();
    mocks.previewAccess.mockReset().mockResolvedValue(false);
    mocks.maybeSingle.mockResolvedValue({ data: { id: "kirtan-1", published: true }, error: null });
  });

  it("returns a token for a valid kirtan", async () => {
    const res = await GET(
      new Request("http://localhost/api/plays/token?kirtan_id=kirtan-1"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(typeof json.token).toBe("string");
    expect(json.token.length).toBeGreaterThan(20);
  });

  it("returns 404 for a missing kirtan", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await GET(
      new Request("http://localhost/api/plays/token?kirtan_id=missing"),
    );

    expect(res.status).toBe(404);
  });

  it("does not issue public play tokens for unpublished kirtans without preview access", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: "hidden-1", published: false }, error: null });
    const res = await GET(new Request("http://localhost/api/plays/token?kirtan_id=hidden-1"));
    expect(res.status).toBe(404);
    expect(mocks.previewAccess).toHaveBeenCalledOnce();
  });

  it("issues a play token for an unpublished preview when the browser is unlocked", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: "hidden-1", published: false }, error: null });
    mocks.previewAccess.mockResolvedValueOnce(true);
    const res = await GET(new Request("http://localhost/api/plays/token?kirtan_id=hidden-1"));
    expect(res.status).toBe(200);
    expect(typeof (await res.json()).token).toBe("string");
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    process.env.PLAYBACK_TOKEN_SECRET = originalPlaybackTokenSecret;
  });
});
