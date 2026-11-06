import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { getRecordedOrderTotals } from "@/lib/recorded-orders";
import { recordProductDetailView } from "@/lib/product-view-recording";

/**
 * Privacy-conscious first-party site metrics.
 *
 * A random browser-generated ID is HMAC-hashed before being written to the DB.
 * We never persist an IP address, user-agent, raw browser ID, contact detail or
 * page query string. A browser is unique once per day and across a rolling
 * 30-day reporting window (until its identifier changes or storage is cleared).
 *
 * Raw hashed IDs are pruned after 35 days. Daily aggregate totals persist so
 * historical page views remain available without retaining visit identifiers.
 */
let initialization: Promise<void> | null = null;

export async function ensureSiteAnalyticsTables(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteTrafficDaily" (
          "day" DATE PRIMARY KEY,
          "pageViews" BIGINT NOT NULL DEFAULT 0,
          "uniqueVisitors" INTEGER NOT NULL DEFAULT 0
        )
      `;
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteTrafficVisitorDays" (
          "day" DATE NOT NULL,
          "visitorHash" CHAR(64) NOT NULL,
          PRIMARY KEY ("day", "visitorHash")
        )
      `;
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteTrafficPages" (
          "day" DATE NOT NULL,
          "path" VARCHAR(64) NOT NULL,
          "pageViews" BIGINT NOT NULL DEFAULT 0,
          PRIMARY KEY ("day", "path")
        )
      `;
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteTrafficDeveloperVisitorDays" (
          "day" DATE NOT NULL,
          "visitorHash" CHAR(64) NOT NULL,
          PRIMARY KEY ("day", "visitorHash")
        )
      `;
      // Unique browsers visiting /install (only rolling 35 days of hashes).
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteTrafficInstallVisitorDays" (
          "day" DATE NOT NULL,
          "visitorHash" CHAR(64) NOT NULL,
          PRIMARY KEY ("day", "visitorHash")
        )
      `;
      await db.$executeRaw`
        DELETE FROM "SiteTrafficInstallVisitorDays"
        WHERE "day" < (now() AT TIME ZONE 'Asia/Kolkata')::date - 35
      `;
      await db.$executeRaw`
        DELETE FROM "SiteTrafficDeveloperVisitorDays"
        WHERE "day" < (now() AT TIME ZONE 'Asia/Kolkata')::date - 35
      `;
      // Cleanup is repeated on subsequent cold starts; read-only daily summary
      // tables deliberately remain available for historical comparisons.
      await db.$executeRaw`
        DELETE FROM "SiteTrafficVisitorDays"
        WHERE "day" < (now() AT TIME ZONE 'Asia/Kolkata')::date - 35
      `;
    })();
  }
  try { await initialization; }
  catch (error) { initialization = null; throw error; }
}

export const PAGE_LABELS: Record<string, string> = {
  "/": "Homepage",
  "/catalogue": "Catalogue",
  "/categories": "Categories",
  "/product": "Product details",
  "/cart": "Price calculator",
  "/contact": "Contact",
  "/developer": "Developer",
  "/install": "Install App",
  "/privacy": "Privacy",
  "/legal-compliance": "Legal information",
  "/other": "Other pages",
};

export function normalizePublicPath(path: string): string {
  if (path === "/") return "/";
  const clean = path.replace(/\/+$/, "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PAGE_LABELS, clean)) return clean;
  if (clean.startsWith("/product/") || clean.startsWith("/products/")) return "/product";
  if (clean.startsWith("/catalogue/")) return "/catalogue";
  if (clean.startsWith("/categories/")) return "/categories";
  return "/other";
}

export async function recordPageView(browserId: string, path: string): Promise<void> {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32) throw new Error("Analytics signing key is not configured.");
  const visitorHash = createHmac("sha256", key).update(browserId).digest("hex");
  const page = normalizePublicPath(path);
  await ensureSiteAnalyticsTables();

  await db.$transaction(async transaction => {
    const firstToday = await transaction.$executeRaw`
      INSERT INTO "SiteTrafficVisitorDays" ("day", "visitorHash")
      VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, ${visitorHash})
      ON CONFLICT ("day", "visitorHash") DO NOTHING
    `;
    await transaction.$executeRaw`
      INSERT INTO "SiteTrafficDaily" ("day", "pageViews", "uniqueVisitors")
      VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, 1, ${firstToday})
      ON CONFLICT ("day") DO UPDATE SET
        "pageViews" = "SiteTrafficDaily"."pageViews" + 1,
        "uniqueVisitors" = "SiteTrafficDaily"."uniqueVisitors" + ${firstToday}
    `;
    await transaction.$executeRaw`
      INSERT INTO "SiteTrafficPages" ("day", "path", "pageViews")
      VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, ${page}, 1)
      ON CONFLICT ("day", "path") DO UPDATE SET
        "pageViews" = "SiteTrafficPages"."pageViews" + 1
    `;
    if (page === "/developer") {
      await transaction.$executeRaw`
        INSERT INTO "SiteTrafficDeveloperVisitorDays" ("day", "visitorHash")
        VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, ${visitorHash})
        ON CONFLICT ("day", "visitorHash") DO NOTHING
      `;
    }
    if (page === "/install") {
      await transaction.$executeRaw`
        INSERT INTO "SiteTrafficInstallVisitorDays" ("day", "visitorHash")
        VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, ${visitorHash})
        ON CONFLICT ("day", "visitorHash") DO NOTHING
      `;
    }
  }, { maxWait: 5000, timeout: 10000 });

  // This additional aggregate is best-effort and must not affect existing
  // visitor/page metrics or any customer-facing page when the optional table
  // cannot be created or updated.
  if (path.startsWith("/catalogue/")) {
    await recordProductDetailView(path).catch(() => undefined);
  }
}

type DailyRow = { day: string; visitors: number; pageViews: bigint; informationRequests: number; generalEnquiries: number };
type PageRow = { path: string; views: bigint };
type CounterRow = { pageViewsAll: bigint; pageViews30: bigint; visitorsToday: number; pageViewsToday: bigint };
type UniqueRow = { count: number };
type DeveloperVisitorsRow = { visitorsToday: number; visitors30: number };
type DeveloperPageViewsRow = { viewsToday: bigint; views30: bigint; viewsAll: bigint };

export async function getSiteAnalyticsSummary() {
  await ensureSiteAnalyticsTables();
  const [
    counters, unique30, dailyRows, popularPages,
    informationRequestsAll, informationRequests30, informationRequestsToday,
    generalEnquiriesAll, generalEnquiries30, generalEnquiriesToday,
    developerVisitors, developerPageViews, orders,
  ] = await Promise.all([
    db.$queryRaw<CounterRow[]>`
      SELECT
        COALESCE(SUM("pageViews"), 0)::bigint AS "pageViewsAll",
        COALESCE(SUM("pageViews") FILTER (WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29), 0)::bigint AS "pageViews30",
        COALESCE(MAX("uniqueVisitors") FILTER (WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::int AS "visitorsToday",
        COALESCE(MAX("pageViews") FILTER (WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::bigint AS "pageViewsToday"
      FROM "SiteTrafficDaily"
    `,
    db.$queryRaw<UniqueRow[]>`
      SELECT COUNT(DISTINCT "visitorHash")::int AS "count"
      FROM "SiteTrafficVisitorDays"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
    `,
    db.$queryRaw<DailyRow[]>`
      SELECT to_char(series."day", 'YYYY-MM-DD') AS "day",
        COALESCE(traffic."uniqueVisitors", 0)::int AS "visitors",
        COALESCE(traffic."pageViews", 0)::bigint AS "pageViews",
        COALESCE(info."count", 0)::int AS "informationRequests",
        COALESCE(general."count", 0)::int AS "generalEnquiries"
      FROM generate_series(
        (now() AT TIME ZONE 'Asia/Kolkata')::date - 13,
        (now() AT TIME ZONE 'Asia/Kolkata')::date,
        interval '1 day'
      ) AS series("day")
      LEFT JOIN "SiteTrafficDaily" traffic ON traffic."day" = series."day"::date
      LEFT JOIN (
        SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS "day", COUNT(*)::int AS "count"
        FROM "InformationEnquiry"
        WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date - 13)::timestamp AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'UTC'
        GROUP BY 1
      ) info ON info."day" = series."day"::date
      LEFT JOIN (
        SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS "day", COUNT(*)::int AS "count"
        FROM "GeneralEnquiry"
        WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date - 13)::timestamp AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'UTC'
        GROUP BY 1
      ) general ON general."day" = series."day"::date
      ORDER BY series."day"
    `,
    db.$queryRaw<PageRow[]>`
      SELECT "path", SUM("pageViews")::bigint AS "views"
      FROM "SiteTrafficPages"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
      GROUP BY "path"
      ORDER BY "views" DESC
      LIMIT 8
    `,
    db.informationEnquiry.count(),
    db.informationEnquiry.count({ where: { createdAt: { gte: indiaDayStart(29) } } }),
    db.informationEnquiry.count({ where: { createdAt: { gte: indiaDayStart(0) } } }),
    db.generalEnquiry.count(),
    db.generalEnquiry.count({ where: { createdAt: { gte: indiaDayStart(29) } } }),
    db.generalEnquiry.count({ where: { createdAt: { gte: indiaDayStart(0) } } }),
    db.$queryRaw<DeveloperVisitorsRow[]>`
      SELECT
        COUNT(DISTINCT "visitorHash") FILTER (
          WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date
        )::int AS "visitorsToday",
        COUNT(DISTINCT "visitorHash") FILTER (
          WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
        )::int AS "visitors30"
      FROM "SiteTrafficDeveloperVisitorDays"
    `,
    db.$queryRaw<DeveloperPageViewsRow[]>`
      SELECT
        COALESCE(SUM("pageViews") FILTER (WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::bigint AS "viewsToday",
        COALESCE(SUM("pageViews") FILTER (WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29), 0)::bigint AS "views30",
        COALESCE(SUM("pageViews"), 0)::bigint AS "viewsAll"
      FROM "SiteTrafficPages"
      WHERE "path" = '/developer'
    `,
    getRecordedOrderTotals(),
  ]);

  const count = counters[0];
  return {
    timeZone: "Asia/Kolkata",
    developerPage: {
      visitorsToday: developerVisitors[0]?.visitorsToday ?? 0,
      visitors30: developerVisitors[0]?.visitors30 ?? 0,
      viewsToday: Number(developerPageViews[0]?.viewsToday ?? BigInt(0)),
      views30: Number(developerPageViews[0]?.views30 ?? BigInt(0)),
      viewsAll: Number(developerPageViews[0]?.viewsAll ?? BigInt(0)),
    },
    orders,
    note: "Unique developer-page visitor tracking starts with this update; previously recorded developer-page views remain available. Visitor counts are anonymous browser estimates. Confirmed order amounts are entered manually by administrators, not collected from enquiries, estimates or online checkout. Request totals show records currently stored.",
    today: {
      visitors: count?.visitorsToday ?? 0,
      pageViews: Number(count?.pageViewsToday ?? BigInt(0)),
      informationRequests: informationRequestsToday,
      generalEnquiries: generalEnquiriesToday,
    },
    last30: {
      visitors: unique30[0]?.count ?? 0,
      pageViews: Number(count?.pageViews30 ?? BigInt(0)),
      informationRequests: informationRequests30,
      generalEnquiries: generalEnquiries30,
    },
    allTime: {
      pageViews: Number(count?.pageViewsAll ?? BigInt(0)),
      informationRequests: informationRequestsAll,
      generalEnquiries: generalEnquiriesAll,
    },
    daily: dailyRows.map(row => ({
      date: row.day, visitors: row.visitors, pageViews: Number(row.pageViews),
      informationRequests: row.informationRequests, generalEnquiries: row.generalEnquiries,
    })),
    popularPages: popularPages.map(row => ({
      path: row.path, label: PAGE_LABELS[row.path] || "Other pages", views: Number(row.views),
    })),
  };
}

// An IST day boundary converted to an absolute UTC instant for Prisma's
// timestamp-with-time-zone comparisons. No hardcoded caller-local timezone.
function indiaDayStart(daysAgo: number): Date {
  const now = Date.now();
  const istOffsetMs = (5 * 60 + 30) * 60_000;
  const istStart = Math.floor((now + istOffsetMs) / 86_400_000) * 86_400_000;
  return new Date(istStart - istOffsetMs - daysAgo * 86_400_000);
}
