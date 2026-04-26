import LeadPageClient from "./LeadPageClient";
import { notFound } from "next/navigation";
import { getLeadPageData } from "@/lib/server/leadPage";
import SubpageHeader from "@/lib/components/SubpageHeader";

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
    return (
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
        <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
          <SubpageHeader title="Lead singer" backLabel="Leads" backHref="/explore/leads" />
          <div className="rounded-[1.75rem] border border-[#ead8d2] bg-white/90 px-6 py-8 shadow-[0_18px_40px_rgba(154,88,68,0.14)]">
            <h2 className="text-lg font-semibold text-stone-800">
              This page could not be loaded right now.
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {error}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    throw new Error("Failed to fetch lead page data");
  }

  return <LeadPageClient key={slug} slug={slug} initialData={data} />;
}
