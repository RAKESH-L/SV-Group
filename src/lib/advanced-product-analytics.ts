import { db } from "@/lib/db";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";
import { ensureSiteAnalyticsTables } from "@/lib/site-analytics";
import { ensureProductAnalyticsTable } from "@/lib/product-view-recording";

/**
 * Aggregated first-party catalogue engagement.
 *
 * The existing visitor tracker already omits admin requests, honours DNT / GPC,
 * and sends only its anonymous browser ID and public pathname. We use the
 * product slug from that pathname solely to increment daily aggregate counters.
 * No visitor identifier, IP, user agent or enquiry contact detail is saved in
 * the new table or returned to the admin dashboard.
 *
 * Product view breakdowns only start collecting after this feature is deployed;
 * the original page tracker grouped every product detail under /catalogue.
 */
const INDIA_OFFSET_MS = (5 * 60 + 30) * 60_000;
function indiaDayStart(daysAgo: number): Date {
  const midnight = Math.floor((Date.now() + INDIA_OFFSET_MS) / 86_400_000) * 86_400_000;
  return new Date(midnight - INDIA_OFFSET_MS - daysAgo * 86_400_000);
}

function dayKey(timestamp: Date): string {
  return new Date(timestamp.getTime() + INDIA_OFFSET_MS).toISOString().slice(0, 10);
}

type ProductRow = {
  productId: string;
  name: string | null;
  slug: string | null;
  categoryName: string | null;
  views: bigint;
};
type CategoryRow = { categoryId: string; name: string | null; views: bigint };
type ViewRow = { date: string; views: bigint };
type TrafficRow = { date: string; visitors: number };
type VisitorRow = { visitors: number };
type TotalsRow = { total: bigint; today: bigint };

export async function getAdvancedProductAnalytics() {
  await Promise.all([ensureProductAnalyticsTable(), ensureSiteAnalyticsTables()]);
  const start = indiaDayStart(29);
  const [
    topProducts,
    topCategories,
    dailyProductViews,
    dailyTraffic,
    uniqueVisitors,
    viewTotals,
    submissions,
  ] = await Promise.all([
    db.$queryRaw<ProductRow[]>`
      SELECT v."productId", p."name" AS "name", p."slug" AS "slug",
        c."name" AS "categoryName", SUM(v."views")::bigint AS "views"
      FROM "SiteProductViewsDaily" v
      LEFT JOIN "Product" p ON p."id" = v."productId"
      LEFT JOIN "Category" c ON c."id" = v."categoryId"
      WHERE v."day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
      GROUP BY v."productId", p."name", p."slug", c."name"
      ORDER BY "views" DESC, "name" ASC
      LIMIT 10
    `,
    db.$queryRaw<CategoryRow[]>`
      SELECT v."categoryId", c."name" AS "name", SUM(v."views")::bigint AS "views"
      FROM "SiteProductViewsDaily" v
      LEFT JOIN "Category" c ON c."id" = v."categoryId"
      WHERE v."day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
      GROUP BY v."categoryId", c."name"
      ORDER BY "views" DESC, "name" ASC
      LIMIT 10
    `,
    db.$queryRaw<ViewRow[]>`
      SELECT to_char("day", 'YYYY-MM-DD') AS "date", SUM("views")::bigint AS "views"
      FROM "SiteProductViewsDaily"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 13
      GROUP BY "day" ORDER BY "day"
    `,
    db.$queryRaw<TrafficRow[]>`
      SELECT to_char("day", 'YYYY-MM-DD') AS "date",
        "uniqueVisitors"::int AS "visitors"
      FROM "SiteTrafficDaily"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 13
      ORDER BY "day"
    `,
    db.$queryRaw<VisitorRow[]>`
      SELECT COUNT(DISTINCT "visitorHash")::int AS "visitors"
      FROM "SiteTrafficVisitorDays"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
    `,
    db.$queryRaw<TotalsRow[]>`
      SELECT COALESCE(SUM("views"), 0)::bigint AS "total",
        COALESCE(SUM("views") FILTER (
          WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date
        ), 0)::bigint AS "today"
      FROM "SiteProductViewsDaily"
      WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
    `,
    db.informationEnquiry.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, message: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const selectedById = new Map<string, { productId: string; name: string; category: string; quantity: number; requests: number }>();
  const dailyRequests = new Map<string, number>();
  const dailyQuantities = new Map<string, number>();
  let submittedQuantity = 0;
  let requestsWithQuantities = 0;

  // Aggregate only non-PII, server-verified snapshot items. Never return free
  // text messages, mobile numbers or per-customer selections to the client.
  for (const submission of submissions) {
    const date = dayKey(submission.createdAt);
    dailyRequests.set(date, (dailyRequests.get(date) || 0) + 1);
    const { items } = decodeEnquiryMessage(submission.message);
    if (items.length) requestsWithQuantities++;
    for (const item of items) {
      submittedQuantity += item.quantity;
      dailyQuantities.set(date, (dailyQuantities.get(date) || 0) + item.quantity);
      const row = selectedById.get(item.productId) ?? {
        productId: item.productId, name: item.name,
        category: item.categoryName, quantity: 0, requests: 0,
      };
      row.quantity += item.quantity;
      row.requests++;
      selectedById.set(item.productId, row);
    }
  }

  const viewsByDay = new Map(dailyProductViews.map(row => [row.date, Number(row.views)]));
  const trafficByDay = new Map(dailyTraffic.map(row => [row.date, row.visitors]));
  const todayDay = indiaDayStart(0).getTime();
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = dayKey(new Date(todayDay - (13 - i) * 86_400_000));
    const visitors = trafficByDay.get(date) || 0;
    const informationRequests = dailyRequests.get(date) || 0;
    return {
      date, visitors,
      productViews: viewsByDay.get(date) || 0,
      informationRequests,
      selectedQuantity: dailyQuantities.get(date) || 0,
      requestsPer100Visitors: visitors > 0 ? Number((informationRequests / visitors * 100).toFixed(1)) : null,
    };
  });

  const visitors30 = uniqueVisitors[0]?.visitors ?? 0;
  const infoRequests30 = submissions.length;
  return {
    periodDays: 30,
    timeZone: "Asia/Kolkata",
    totals: {
      productViewsToday: Number(viewTotals[0]?.today ?? BigInt(0)),
      productViews30: Number(viewTotals[0]?.total ?? BigInt(0)),
      submittedQuantity30: submittedQuantity,
      enquiries30: infoRequests30,
      requestsWithQuantities30: requestsWithQuantities,
      trackedVisitors30: visitors30,
      requestsPer100Visitors30: visitors30 > 0 ? Number((infoRequests30 / visitors30 * 100).toFixed(1)) : null,
    },
    topProducts: topProducts.map(row => ({
      id: row.productId,
      name: row.name || "Previously listed product",
      slug: row.slug,
      category: row.categoryName || "Previously listed category",
      views: Number(row.views),
    })),
    topCategories: topCategories.map(row => ({
      id: row.categoryId,
      name: row.name || "Previously listed category",
      views: Number(row.views),
    })),
    selectedProducts: [...selectedById.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)).slice(0, 10),
    daily: days,
    notes: {
      viewTracking: "Per-product view tracking begins with this release. Previous visits were stored only as general catalogue views. Only public, non-opted-out browser visits count; repeat opens count as additional views.",
      categoryTracking: "Category interest is the sum of views of product-detail pages in each category, not unique category visitors or impressions.",
      selections: "Quantities are from server-verified items in submitted information requests still stored within the last 30 days; they do not include unsubmitted calculator selections or purchases.",
      enquiries: "Requests per 100 tracked visitors is an activity ratio, not a verified person-level conversion rate. One browser may send multiple enquiries; visitors may opt out of analytics.",
    },
  };
}
