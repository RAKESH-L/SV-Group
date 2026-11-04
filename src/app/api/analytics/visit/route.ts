import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordPageView } from "@/lib/site-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  visitorId: z.string().uuid(),
  path: z.string().min(1).max(120).regex(/^\/[a-zA-Z0-9/_-]*$/),
}).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ error: "Cross-site analytics disabled." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 500) {
    return NextResponse.json({ error: "Too large." }, { status: 413 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.path === "/admin" || parsed.data.path.startsWith("/admin/")) {
    return NextResponse.json({ error: "Invalid visit." }, { status: 400 });
  }
  try {
    await recordPageView(parsed.data.visitorId, parsed.data.path);
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Analytics should never prevent a visitor from using the catalogue.
    return NextResponse.json({ error: "Metrics are temporarily unavailable." }, { status: 503 });
  }
}
