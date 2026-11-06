import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordPwaInstall } from "@/lib/site-pwa-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  visitorId: z.string().uuid(),
  source: z.enum(["appinstalled", "standalone"]),
}).strict();

/**
 * Browser-only voluntary telemetry, same privacy policy as page-view metrics.
 * No personal or device information is requested. This endpoint never
 * installs an application, only counts observed browser events.
 */
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
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid installation event." }, { status: 400 });
  }
  try {
    const counted = await recordPwaInstall(parsed.data.visitorId, parsed.data.source);
    return NextResponse.json({ counted }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ error: "Installation metrics are unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
