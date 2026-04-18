import HomeClient from "./HomeClient";
import { getHomePageData } from "@/lib/server/homePage";

export default async function Home() {
  const result = await getHomePageData();
  if (result.error || !result.data) {
    throw new Error("Failed to fetch home data");
  }

  return <HomeClient data={result.data} />;
}
