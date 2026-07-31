import { NextResponse } from "next/server";
import { listAdminKirtanFormOptions } from "@/lib/admin/data";

export async function GET() {
  try {
    const result = await listAdminKirtanFormOptions();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load kirtan form options",
      },
      { status: 500 },
    );
  }
}
