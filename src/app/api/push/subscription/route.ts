import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidPushSubscription, subscribeDevice, unsubscribeDevice, isAllowedPushEndpoint } from "@/lib/site-push";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const subscriptionSchema = z.object({
  endpoint: z.string().min(20).max(2048),
  keys: z.object({p256dh: z.string().min(40).max(200), auth: z.string().min(15).max(200)}).strict(),
}).strict();
function forbidden(request: NextRequest) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return (origin && origin !== request.nextUrl.origin) ||
    (site && site !== "same-origin" && site !== "none");
}
function response(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export async function POST(request: NextRequest) {
  if (forbidden(request)) return response({ error: "Cross-site request denied." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 3600) return response({ error: "Subscription request too large." }, 413);
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidPushSubscription(parsed.data)) return response({ error: "Invalid browser push subscription." }, 400);
  try {
    await subscribeDevice(parsed.data);
    return response({ subscribed: true });
  } catch { return response({ error: "Could not save notification subscription." }, 503); }
}
export async function DELETE(request: NextRequest) {
  if (forbidden(request)) return response({ error: "Cross-site request denied." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 2500) return response({ error: "Invalid request size." }, 413);
  const input = z.object({ endpoint: z.string().max(2048) }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success || !isAllowedPushEndpoint(input.data.endpoint)) return response({ error: "Invalid subscription endpoint." }, 400);
  try {
    await unsubscribeDevice(input.data.endpoint);
    return response({ subscribed: false });
  } catch { return response({ error: "Could not remove the subscription." }, 503); }
}
