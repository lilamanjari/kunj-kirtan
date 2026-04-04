import BhajansPageClient from "./BhajansPageClient";
import { getBhajansPageData } from "@/lib/server/bhajansPage";

export const revalidate = 86400;

export default async function BhajansPage() {
  const { data, error } = await getBhajansPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch bhajans page data");
  }

  return <BhajansPageClient initialData={data} />;
}
