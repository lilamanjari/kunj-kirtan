import { NextResponse } from "next/server";
import { listAdminKirtans } from "@/lib/admin/data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const result = await listAdminKirtans({
      search,
      type: type === "MM" || type === "BHJ" || type === "HK" ? type : "all",
      status:
        status === "published" || status === "hidden" || status === "all"
          ? status
          : "all",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load kirtans",
      },
      { status: 500 },
    );
  }
}
