import { KirtansCmsPage } from "@/app/admin/kirtans/KirtansCmsPage";

export default async function AdminKirtansPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const params = await searchParams;
  return <KirtansCmsPage initialSelectedId={params.selected ?? null} />;
}
