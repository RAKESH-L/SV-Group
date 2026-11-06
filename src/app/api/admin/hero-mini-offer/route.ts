import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getAdminId } from "@/lib/auth";
import { getPublishedMiniHeroOffer, miniHeroOfferSchema, publishMiniHeroOffer } from "@/lib/site-hero-mini-offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET() {
  if (!(await getAdminId())) return json({ error: "Unauthorized." }, 401);
  return json({ offer: await getPublishedMiniHeroOffer() });
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminId())) return json({ error: "Unauthorized." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ error: "Invalid origin." }, 403);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json({ error: "Cross-site changes are not allowed." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 3200) return json({ error: "Banner settings are too large." }, 413);

  const parsed = miniHeroOfferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check your banner message, button label, and destination. Only safe on-site links are allowed." }, 400);
  try {
    await publishMiniHeroOffer(parsed.data);
    try { revalidateTag("sv-mini-hero-offer", { expire: 0 }); }
    catch (error) { console.error("Could not invalidate public mini offer cache", error); }
    return json({ offer: parsed.data, saved: true });
  } catch {
    return json({ error: "Banner could not be published. Previous settings remain unchanged. Check database access." }, 503);
  }
}
