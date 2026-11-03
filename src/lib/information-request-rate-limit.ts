import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export async function informationRequestRateLimited(ip: string, limit = 4, windowMs = 10 * 60_000) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Rate limit privacy key is not configured.");
  const key = createHash("sha256").update(`${secret}:${ip}`).digest("hex");
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "InformationRequestRateLimit" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${windowStart}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "InformationRequestRateLimit"."windowStart" <> EXCLUDED."windowStart" THEN 1 ELSE "InformationRequestRateLimit"."count" + 1 END,
      "windowStart" = EXCLUDED."windowStart",
      "updatedAt" = NOW()
    RETURNING "count"
  `;
  return (rows[0]?.count || 0) > limit;
}
