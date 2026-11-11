import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

import { revalidateCmsAndPublicContent } from "./revalidate";

describe("revalidateCmsAndPublicContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("immediately invalidates occasion detail data and route output", () => {
    revalidateCmsAndPublicContent();

    expect(mocks.revalidateTag).toHaveBeenCalledWith("explore-occasion-slugs", { expire: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[locale]/explore/occasions/[slug]", "page");
  });
});
