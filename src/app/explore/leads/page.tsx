import LeadsPageClient from "./LeadsPageClient";
import { getLeadsPageData } from "@/lib/server/leadsPage";

export const revalidate = 86400;

export default async function LeadsPage() {
  const { data, error } = await getLeadsPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch lead singers page data");
  }

  return <LeadsPageClient leads={data.leads} />;
}
