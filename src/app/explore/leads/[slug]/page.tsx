import LeadPageClient from "./LeadPageClient";
import { notFound } from "next/navigation";
import { getLeadPageData } from "@/lib/server/leadPage";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data, status, error } = await getLeadPageData(slug);

  if (status === 404) {
    notFound();
  }

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Failed to fetch lead page data");
  }

  return <LeadPageClient key={slug} slug={slug} initialData={data} />;
}
