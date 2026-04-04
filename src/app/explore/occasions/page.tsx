import OccasionsPageClient from "./OccasionsPageClient";
import { getOccasionsPageData } from "@/lib/server/occasionsPage";

export const revalidate = 86400;

export default async function OccasionsPage() {
  const { data, error } = await getOccasionsPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch occasions page data");
  }

  return <OccasionsPageClient occasions={data.occasions} />;
}
