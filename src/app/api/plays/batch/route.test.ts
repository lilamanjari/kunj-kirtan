import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ selectIn: vi.fn(), insert: vi.fn(), previewAccess: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "kirtans") {
        return {
          select: () => ({
            in: mocks.selectIn,
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

describe("POST /api/plays/batch", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    mocks.selectIn.mockReset();
    mocks.insert.mockReset();
    mocks.previewAccess.mockReset().mockResolvedValue(false);
    mocks.selectIn.mockResolvedValue({
      data: [{ id: "kirtan-1", published: true }, { id: "kirtan-2", published: true }],
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: null });
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
    expect(mocks.insert).toHaveBeenCalledWith([
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

  it("does not record unpublished plays from a locked browser", async () => {
    mocks.selectIn.mockResolvedValueOnce({ data: [{ id: "hidden-1", published: false }], error: null });
    const res = await POST(new Request("http://localhost/api/plays/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plays: [{ kirtan_id: "hidden-1", seconds_played: 20 }] }),
    }));
    expect(res.status).toBe(404);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });
});
