import HomeClient from "./HomeClient";
import { getHomePageData } from "@/lib/server/homePage";
import type { HomeData } from "@/types/home";

const EMPTY_HOME_DATA: HomeData = {
  primary_action: null,
  current_occasion: null,
  entry_points: [
    { id: "MM", label: "Maha Mantras", count: null },
    { id: "BHJ", label: "Bhajans", count: null },
    { id: "LEADS", label: "Lead Singers", count: null },
    { id: "OCCASIONS", label: "Occasions", count: null },
  ],
  popular: [],
  recommended: [],
  recently_added: [],
};

export default async function HomePage() {
  const result = await getHomePageData();
  if (result.error || !result.data) {
    console.error("Failed to fetch home data", result.error);
    return <HomeClient data={EMPTY_HOME_DATA} />;
  }

  return <HomeClient data={result.data} />;
}
