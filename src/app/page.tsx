import HomeClient from "./HomeClient";
import type { HomeData } from "@/types/home";

async function getHomeData(): Promise<HomeData> {
  const res = await fetch("http://localhost:3000/api/home", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch home data");
  }

  return res.json();
}

export default async function Home() {
  const data = await getHomeData();
  return <HomeClient data={data} />;
}
