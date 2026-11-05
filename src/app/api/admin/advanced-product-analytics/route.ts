import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/auth";
import { getAdvancedProductAnalytics } from "@/lib/advanced-product-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminId())) {
    return NextResponse.json({ error: "Unauthorized." }, {
      status: 401, headers: { "Cache-Control": "private, no-store" },
    });
  }
  try {
    const insights = await getAdvancedProductAnalytics();
    return NextResponse.json(insights, {
      headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
    });
  } catch {
    return NextResponse.json({
      error: "Advanced product analytics is unavailable. Check the PostgreSQL connection and permission to create the product-views reporting table.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
