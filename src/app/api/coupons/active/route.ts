import { NextResponse } from "next/server";
import { getActiveCoupon } from "@/lib/coupon-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const coupon = await getActiveCoupon();
  return NextResponse.json({ coupon }, { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff" } });
}
