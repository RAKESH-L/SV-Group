import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { couponMinimumMet, couponSavingsPaise } from "@/lib/coupon";
import { getActiveCoupon } from "@/lib/coupon-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,24}$/),
  subtotalPaise: z.number().int().nonnegative().max(100000000000),
}).strict();
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 450) return json({ error: "Request too large" }, 413);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a valid coupon code." }, 400);
  const coupon = await getActiveCoupon();
  if (!coupon || parsed.data.code !== coupon.code) return json({ error: "Coupon code is invalid, inactive or expired." }, 404);
  if (!couponMinimumMet(coupon, parsed.data.subtotalPaise)) {
    return json({ error: `This code requires an indicative subtotal of at least ₹${coupon.minSubtotalRupees.toLocaleString("en-IN")}.` }, 400);
  }
  return json({ coupon, savingsPaise: couponSavingsPaise(parsed.data.subtotalPaise, coupon.percentOff) });
}
