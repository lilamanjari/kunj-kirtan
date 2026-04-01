import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

function request(secret?: string) {
  return new Request("http://localhost/api/revalidate/home", {
    method: "POST",
    headers: secret ? { "x-revalidate-secret": secret } : {},
  });
}

beforeEach(() => {
  revalidatePath.mockReset();
  revalidateTag.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/revalidate/[target]", () => {
  it("rejects unauthorized requests", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "secret");

    const res = await POST(request(), {
      params: Promise.resolve({ target: "home" }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("revalidates grouped explore paths", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "secret");

    const res = await POST(request("secret"), {
      params: Promise.resolve({ target: "explore" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      revalidated: true,
      target: "explore",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/api/explore/bhajans");
    expect(revalidatePath).toHaveBeenCalledWith("/explore/leads");
    expect(revalidatePath).toHaveBeenCalledTimes(8);
  });

  it("revalidates all groups", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "secret");

    const res = await POST(request("secret"), {
      params: Promise.resolve({ target: "all" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.target).toBe("all");
    expect(revalidateTag).toHaveBeenCalledWith("home");
    expect(revalidateTag).toHaveBeenCalledWith("rare-gems");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/api/home");
    expect(revalidatePath).toHaveBeenCalledWith("/api/explore/maha-mantras");
  });
});
