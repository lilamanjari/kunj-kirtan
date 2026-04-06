import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createPlayToken } from "@/lib/server/playTokens";

const maybeSingleMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "kirtans") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          }),
        };
      }

      if (table === "kirtan_plays") {
        return {
          insert: insertMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

describe("POST /api/plays", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalPlaybackTokenSecret = process.env.PLAYBACK_TOKEN_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.PLAYBACK_TOKEN_SECRET = "test-playback-secret";
    maybeSingleMock.mockReset();
    insertMock.mockReset();
    maybeSingleMock.mockResolvedValue({ data: { id: "kirtan-1" }, error: null });
    insertMock.mockResolvedValue({ error: null });
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
    expect(insertMock).toHaveBeenCalledWith({
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
    expect(insertMock).not.toHaveBeenCalled();
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    process.env.PLAYBACK_TOKEN_SECRET = originalPlaybackTokenSecret;
  });
});
