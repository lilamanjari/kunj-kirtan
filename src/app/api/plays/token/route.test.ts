import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  },
}));

describe("GET /api/plays/token", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalPlaybackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.PLAYBACK_TOKEN_SECRET = "test-playback-secret";
    maybeSingleMock.mockReset();
    maybeSingleMock.mockResolvedValue({ data: { id: "kirtan-1" }, error: null });
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
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const res = await GET(
      new Request("http://localhost/api/plays/token?kirtan_id=missing"),
    );

    expect(res.status).toBe(404);
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    process.env.PLAYBACK_TOKEN_SECRET = originalPlaybackTokenSecret;
  });
});
