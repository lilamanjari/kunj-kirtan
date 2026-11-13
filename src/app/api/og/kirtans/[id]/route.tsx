import { ImageResponse } from "next/og";
import { getPublicKirtanPageData } from "@/lib/server/kirtanPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, status } = await getPublicKirtanPageData(id);
  if (!data || status !== 200) return new Response("Kirtan not found", { status: 404 });

  let imageSource: string | null = null;
  const imageUrl = data.kirtan.lead_singer_image_url;
  if (imageUrl) {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
      if (response.ok) {
        const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
        const encoded = Buffer.from(await response.arrayBuffer()).toString("base64");
        imageSource = `data:${contentType};base64,${encoded}`;
      }
    } catch {
      // Keep a branded, text-only preview if the source image is unavailable.
    }
  }

  const title = data.kirtan.title.length > 72
    ? `${data.kirtan.title.slice(0, 69).trimEnd()}…`
    : data.kirtan.title;
  const singer = data.kirtan.lead_singer;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#f7f0e5",
          color: "#60483e",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 740,
            height: 630,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#e9dfd0",
          }}
        >
          {imageSource ? (
            <img
              src={imageSource}
              width={740}
              height={630}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: 44, color: "#9a806a" }}>
              Kunj Kirtans
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            padding: "56px 48px",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, color: "#82936a", marginBottom: 22 }}>
            KUNJ KIRTANS
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1.12,
            }}
          >
            {title}
          </div>
          {singer ? (
            <div style={{ display: "flex", marginTop: 24, fontSize: 23, color: "#92786b" }}>
              {singer}
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: 38, fontSize: 18, color: "#a78f7b" }}>
            kunjkirtans.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
