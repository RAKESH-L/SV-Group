import { db } from "@/lib/db";
import {
  DEFAULT_COUPON, couponIsActive, couponSettingsSchema,
  type CouponSettings, type PublicCoupon,
} from "@/lib/coupon";

let tableInitialized: Promise<void> | null = null;

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const info = error as { code?: string; meta?: { code?: string }; message?: string };
  return info.meta?.code === "42P01" || (info.code === "P2010" && /42P01|does not exist/.test(info.message || ""));
}

async function ensureCouponTable() {
  if (!tableInitialized) {
    tableInitialized = db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteCalculatorCoupon" (
        "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
        "settings" JSONB NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  try { await tableInitialized; }
  catch (error) { tableInitialized = null; throw error; }
}

/** Missing new table = first-run campaign. An actual DB failure fails closed. */
export async function getCouponSettings(): Promise<CouponSettings | null> {
  try {
    const rows = await db.$queryRaw<Array<{ settings: unknown }>>`
      SELECT "settings" FROM "SiteCalculatorCoupon" WHERE "id" = 1 LIMIT 1
    `;
    if (!rows.length) return DEFAULT_COUPON;
    const parsed = couponSettingsSchema.safeParse(rows[0].settings);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (isMissingTable(error)) return DEFAULT_COUPON;
    console.error("Coupon settings unavailable", error);
    return null;
  }
}

export async function getActiveCoupon(): Promise<PublicCoupon | null> {
  const coupon = await getCouponSettings();
  return coupon && couponIsActive(coupon) ? coupon : null;
}

export async function publishCouponSettings(input: CouponSettings): Promise<void> {
  const settings = couponSettingsSchema.parse(input);
  await ensureCouponTable();
  await db.$executeRaw`
    INSERT INTO "SiteCalculatorCoupon" ("id", "settings", "updatedAt")
    VALUES (1, ${JSON.stringify(settings)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "settings" = EXCLUDED."settings", "updatedAt" = NOW()
  `;
}
