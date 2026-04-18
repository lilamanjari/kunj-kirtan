import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { getHomePageData } from "@/lib/server/homePage";

export async function GET() {
  const timing = new ServerTiming();
  const result = await timing.measure("home", () => getHomePageData());

  if (result.error || !result.data) {
    return jsonWithServerTiming({ error: result.error }, timing, {
      status: result.status,
    });
  }

  return jsonWithServerTiming(result.data, timing);
}
