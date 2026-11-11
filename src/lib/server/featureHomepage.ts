import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLocales } from "@/lib/i18n/config";
import { getHomePageData } from "@/lib/server/homePage";

export function revalidateFeatureHomepage() {
  revalidateTag("home", { expire: 0 });
  revalidatePath("/api/home", "page");
  revalidatePath("/", "page");
  for (const locale of supportedLocales) revalidatePath(`/${locale}`, "page");
}

// Called in a separate request after invalidation has completed.
export async function warmFeatureHomepage(origin: string) {
  const home = await getHomePageData();
  if (home.error || !home.data) throw new Error(home.error || "Homepage data could not be warmed");
  for (const locale of supportedLocales) {
    const response = await fetch(new URL(`/${locale}`, origin), { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Homepage cache warming failed (${response.status})`);
    // Consume the complete streamed response before reporting success.
    await response.text();
  }
}
