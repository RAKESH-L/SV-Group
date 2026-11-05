import { db } from "@/lib/db";

/** Aggregate-only product-detail view tracking; no visitor identifiers. */
let initialized: Promise<void> | null = null;
export async function ensureProductAnalyticsTable(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteProductViewsDaily" (
          "day" DATE NOT NULL,
          "productId" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL,
          "views" BIGINT NOT NULL DEFAULT 0,
          PRIMARY KEY ("day", "productId")
        )
      `;
      await db.$executeRaw`
        CREATE INDEX IF NOT EXISTS "SiteProductViewsDaily_category_day_idx"
          ON "SiteProductViewsDaily" ("categoryId", "day")
      `;
    })();
  }
  try { await initialized; } catch (error) { initialized = null; throw error; }
}

export async function recordProductDetailView(path: string): Promise<void> {
  // Do not count catalogue landing or category-filter visits as product views.
  const match = /^\/catalogue\/([a-z0-9][a-z0-9-]{0,99})\/?$/.exec(path);
  if (!match) return;
  await ensureProductAnalyticsTable();
  const slug = match[1];
  // INSERT SELECT rejects invalid, deleted or hidden products without a round
  // trip. The category ID is captured at viewing time even if later changed.
  await db.$executeRaw`
    INSERT INTO "SiteProductViewsDaily" ("day", "productId", "categoryId", "views")
    SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date, p."id", p."categoryId", 1
    FROM "Product" p
    WHERE p."slug" = ${slug} AND p."active" = true
    ON CONFLICT ("day", "productId") DO UPDATE SET
      "views" = "SiteProductViewsDaily"."views" + 1,
      "categoryId" = EXCLUDED."categoryId"
  `;
}

