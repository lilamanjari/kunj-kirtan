import OccasionDetailClient from "./OccasionDetailClient";
import { getOccasionPageData } from "@/lib/server/occasionPage";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export default async function LocalizedOccasionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data, status, error } = await getOccasionPageData(slug);

  if (status === 404) {
    notFound();
  }

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Failed to fetch occasion page data");
  }

  return <OccasionDetailClient initialData={data} />;
}
