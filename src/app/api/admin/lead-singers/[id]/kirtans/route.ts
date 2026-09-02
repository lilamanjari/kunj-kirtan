import { NextResponse } from "next/server";
import { listAdminLeadSingerKirtans } from "@/lib/admin/data";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "20");

    return NextResponse.json(
      await listAdminLeadSingerKirtans({
        leadSingerId: id,
        offset,
        limit,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load lead singer kirtans",
      },
      { status: 500 },
    );
  }
}
