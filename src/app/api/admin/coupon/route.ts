import { NextRequest, NextResponse } from "next/server";
import { getAdminId } from "@/lib/auth";
import { couponSettingsSchema } from "@/lib/coupon";
import { getCouponSettings, publishCouponSettings } from "@/lib/coupon-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" },
});

export async function GET() {
  if (!(await getAdminId())) return response({ error: "Unauthorized" }, 401);
  const coupon = await getCouponSettings();
  if (!coupon) return response({ error: "Coupon settings unavailable. Check the database." }, 503);
  return response({ coupon });
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminId())) return response({ error: "Unauthorized" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return response({ error: "Invalid origin" }, 403);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return response({ error: "Cross-site update forbidden" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 2400) return response({ error: "Settings too large" }, 413);
  const parsed = couponSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: parsed.error.issues[0]?.message || "Check the coupon details and dates." }, 400);
  try {
    await publishCouponSettings(parsed.data);
    return response({ coupon: parsed.data, saved: true });
  } catch {
    return response({ error: "Coupon could not be saved. Check database permissions." }, 503);
  }
}
