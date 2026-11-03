import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  const authorized = Boolean(secret) && authorization.length === expected.length && timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const result = await db.informationEnquiry.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const rateLimits = await db.informationRequestRateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } });
  return NextResponse.json({ ok: true, deleted: result.count, expiredRateLimitKeys: rateLimits.count });
}
