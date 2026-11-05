import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { getAdminNotificationFeed, markAdminNotifications } from "@/lib/admin-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().min(5).max(180) }).strict(),
  z.object({ action: z.literal("unread"), id: z.string().min(5).max(180) }).strict(),
  z.object({ action: z.literal("read-all") }).strict(),
]);

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET() {
  const adminId = await getAdminId();
  if (!adminId) return reply({ error: "Unauthorized." }, 401);
  try {
    return reply(await getAdminNotificationFeed(adminId));
  } catch {
    return reply({ error: "Notifications could not be loaded. Check database access and permissions." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return reply({ error: "Unauthorized." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid request origin." }, 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return reply({ error: "Cross-site updates are not allowed." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 700) return reply({ error: "Request is too large." }, 413);

  const input = actionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: "Invalid notification action." }, 400);
  try {
    await markAdminNotifications(adminId, input.data.action, "id" in input.data ? input.data.id : undefined);
    return reply(await getAdminNotificationFeed(adminId));
  } catch (error) {
    if (error instanceof Error && error.message === "NOTIFICATION_NOT_FOUND") {
      return reply({ error: "This notification is no longer available. Refresh the inbox." }, 404);
    }
    return reply({ error: "Could not update notification read status. Please try again." }, 503);
  }
}
