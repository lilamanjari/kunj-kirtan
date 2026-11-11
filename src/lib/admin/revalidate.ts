import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLocales } from "@/lib/i18n/config";

export function revalidateCmsAndPublicContent() {
  revalidateTag("home", "max");
  revalidateTag("rare-gems", "max");
  revalidateTag("kirtan-page", "max");
  revalidateTag("explore-bhajans", "max");
  revalidateTag("explore-maha-mantras", "max");
  revalidateTag("explore-leads", "max");
  revalidateTag("explore-leads-slugs", "max");
  revalidateTag("explore-occasions", "max");
  // Occasion detail data and rendered pages must drop a cached miss as soon
  // as an occasion is published or its slug/content changes.
  revalidateTag("explore-occasion-slugs", { expire: 0 });
  revalidatePath("/[locale]/explore/occasions/[slug]", "page");

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/kirtans", "page");
  revalidatePath("/admin/tags", "page");
  revalidatePath("/api/admin/kirtans", "page");
  revalidatePath("/api/admin/tags", "page");
  revalidatePath("/api/home", "page");
  revalidatePath("/", "page");
  revalidatePath("/sitemap.xml", "page");

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`, "page");
    revalidatePath(`/${locale}/explore/bhajans`, "page");
    revalidatePath(`/${locale}/explore/maha-mantras`, "page");
    revalidatePath(`/${locale}/explore/leads`, "page");
    revalidatePath(`/${locale}/explore/occasions`, "page");
  }
}
