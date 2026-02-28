import HomeClient from "./HomeClient";
import type { HomeData } from "@/types/home";
import { headers } from "next/headers";

async function getHomeData(): Promise<HomeData> {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/home`, {
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
