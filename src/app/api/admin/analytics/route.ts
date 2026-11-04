import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/auth";
import { getSiteAnalyticsSummary } from "@/lib/site-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminId())) {
    return NextResponse.json({ error: "Unauthorized." }, {
      status: 401, headers: { "Cache-Control": "private, no-store" },
    });
  }
  try {
    const analytics = await getSiteAnalyticsSummary();
    return NextResponse.json(analytics, {
      headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
    });
  } catch {
    return NextResponse.json({
      error: "Website analytics could not be loaded. Check the database connection and permission to create the optional analytics tables.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
