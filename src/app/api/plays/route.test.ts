import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createPlayToken } from "@/lib/server/playTokens";

const mocks = vi.hoisted(() => ({ maybeSingle: vi.fn(), insert: vi.fn(), previewAccess: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "kirtans") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.maybeSingle,
            }),
          }),
        };
      }

      if (table === "kirtan_plays") {
        return {
          insert: mocks.insert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));
vi.mock("@/lib/server/unpublishedPreview", () => ({ hasUnpublishedPreviewAccess: mocks.previewAccess }));

describe("POST /api/plays", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalPlaybackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.PLAYBACK_TOKEN_SECRET = "test-playback-secret";
    mocks.maybeSingle.mockReset();
    mocks.insert.mockReset();
    mocks.previewAccess.mockReset().mockResolvedValue(false);
    mocks.maybeSingle.mockResolvedValue({ data: { id: "kirtan-1", published: true }, error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("records a qualified play with inferred headers", async () => {
    const req = new Request("http://localhost/api/plays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Vitest Browser",
        "x-vercel-ip-country": "IN",
      },
      body: JSON.stringify({
        kirtan_id: "kirtan-1",
        seconds_played: 17,
        session_id: "session-1",
        client_id: "client-1",
        token: createPlayToken("kirtan-1"),
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mocks.insert).toHaveBeenCalledWith({
      kirtan_id: "kirtan-1",
      seconds_played: 17,
      qualified: true,
      session_id: "session-1",
      client_id: "client-1",
      user_agent: "Vitest Browser",
      country: "IN",
    });
  });

  it("rejects missing kirtan_id", async () => {
    const req = new Request("http://localhost/api/plays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid tokens", async () => {
    const req = new Request("http://localhost/api/plays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kirtan_id: "kirtan-1",
        seconds_played: 15,
        token: "bad.token",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not record an unpublished play without preview access", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: "hidden-1", published: false }, error: null });
    const res = await POST(new Request("http://localhost/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kirtan_id: "hidden-1", seconds_played: 20, token: createPlayToken("hidden-1") }),
    }));
    expect(res.status).toBe(404);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    process.env.PLAYBACK_TOKEN_SECRET = originalPlaybackTokenSecret;
  });
});
