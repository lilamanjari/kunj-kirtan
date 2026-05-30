import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLocales } from "@/lib/i18n/config";

export function revalidateCmsAndPublicContent() {
  revalidateTag("home", "max");
  revalidateTag("rare-gems", "max");
  revalidateTag("explore-bhajans", "max");
  revalidateTag("explore-maha-mantras", "max");
  revalidateTag("explore-leads", "max");
  revalidateTag("explore-leads-slugs", "max");
  revalidateTag("explore-occasions", "max");
  revalidateTag("explore-occasion-slugs", "max");

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/kirtans", "page");
  revalidatePath("/admin/tags", "page");
  revalidatePath("/api/admin/kirtans", "page");
  revalidatePath("/api/admin/tags", "page");
  revalidatePath("/api/home", "page");
  revalidatePath("/", "page");

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`, "page");
    revalidatePath(`/${locale}/explore/bhajans`, "page");
    revalidatePath(`/${locale}/explore/maha-mantras`, "page");
    revalidatePath(`/${locale}/explore/leads`, "page");
    revalidatePath(`/${locale}/explore/occasions`, "page");
  }
}
