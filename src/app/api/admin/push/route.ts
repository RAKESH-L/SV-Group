import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { broadcastPush, getPushAdminSummary } from "@/lib/site-push";
import { isSafePromoPath } from "@/lib/site-promo-cards";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().trim().min(4).max(64),
  message: z.string().trim().min(8).max(180),
  path: z.string().trim().min(1).max(120).refine(isSafePromoPath),
  cursor: z.string().min(20).max(2048).optional(),
}).strict();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

export async function GET() {
  if (!(await getAdminId())) return json({ error: "Unauthorized" }, 401);
  try { return json(await getPushAdminSummary()); }
  catch { return json({ error: "Push notification data is unavailable. Check database permissions." }, 503); }
}

export async function POST(request: NextRequest) {
  if (!(await getAdminId())) return json({ error: "Unauthorized" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ error: "Invalid origin" }, 403);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json({ error: "Cross-site broadcasts are not allowed." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 4000) return json({ error: "Broadcast too large." }, 413);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a title (4–64), message (8–180) and safe website destination." }, 400);
  try {
    const result = await broadcastPush(parsed.data);
    return json({ ...result, campaignId: parsed.data.campaignId });
  } catch (error) {
    return json({ error: error instanceof Error && error.message.startsWith("Campaign content changed")
      ? error.message : "Could not complete this broadcast batch. Check database access or retry the same batch." }, 503);
  }
}
