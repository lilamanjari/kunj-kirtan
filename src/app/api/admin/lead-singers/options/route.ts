import { NextResponse } from "next/server";
import { listAdminLeadSingerFormOptions } from "@/lib/admin/data";

export async function GET() {
  try {
    return NextResponse.json(await listAdminLeadSingerFormOptions());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load lead singer options",
      },
      { status: 500 },
    );
  }
}
