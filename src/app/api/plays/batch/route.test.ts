import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const selectInMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "kirtans") {
        return {
          select: () => ({
            in: selectInMock,
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

describe("POST /api/plays/batch", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    selectInMock.mockReset();
    insertMock.mockReset();
    selectInMock.mockResolvedValue({
      data: [{ id: "kirtan-1" }, { id: "kirtan-2" }],
      error: null,
    });
    insertMock.mockResolvedValue({ error: null });
  });

  it("records a batch of qualified plays", async () => {
    const req = new Request("http://localhost/api/plays/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Vitest Browser",
        "x-vercel-ip-country": "US",
      },
      body: JSON.stringify({
        plays: [
          {
            id: "1",
            kirtan_id: "kirtan-1",
            seconds_played: 19,
            session_id: "session-1",
            client_id: "client-1",
            played_at: new Date().toISOString(),
          },
          {
            id: "2",
            kirtan_id: "kirtan-2",
            seconds_played: 24,
            session_id: "session-2",
            client_id: "client-2",
            played_at: new Date().toISOString(),
          },
        ],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, count: 2 });
    expect(insertMock).toHaveBeenCalledWith([
      {
        kirtan_id: "kirtan-1",
        seconds_played: 19,
        qualified: true,
        session_id: "session-1",
        client_id: "client-1",
        user_agent: "Vitest Browser",
        country: "US",
      },
      {
        kirtan_id: "kirtan-2",
        seconds_played: 24,
        qualified: true,
        session_id: "session-2",
        client_id: "client-2",
        user_agent: "Vitest Browser",
        country: "US",
      },
    ]);
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });
});
