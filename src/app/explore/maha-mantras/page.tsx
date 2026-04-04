import MahaMantrasPageClient from "./MahaMantrasPageClient";
import { getMahaMantrasPageData } from "@/lib/server/mahaMantrasPage";

export const revalidate = 86400;

export default async function MahaMantrasPage() {
  const { data, error } = await getMahaMantrasPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch maha mantras page data");
  }

  return <MahaMantrasPageClient initialData={data} />;
}
