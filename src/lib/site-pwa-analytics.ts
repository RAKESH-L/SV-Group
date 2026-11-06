import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { ensureSiteAnalyticsTables } from "@/lib/site-analytics";

/**
 * Approximate installs, not app-store downloads:
 * - appinstalled is emitted by browsers that expose it (usually Chromium).
 * - standalone means first observed installed-app launch (useful on iOS).
 * - duplicates from the same browser ID are ignored for 35 days, and client
 *   localStorage additionally avoids retrying an already-accepted event.
 *
 * No IP address, user agent, raw browser ID, name or phone number is stored.
 * The HMAC token is pruned after 35 days; daily aggregate counts are retained.
 * Reinstallation or isolated storage can be counted again, so report these
 * numbers as DETECTED INSTALLS, never exact unique people or app downloads.
 */
export type PwaInstallSource = "appinstalled" | "standalone";
let initialization: Promise<void> | null = null;

export async function ensurePwaAnalyticsTables(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SitePwaInstallDaily" (
          "day" DATE PRIMARY KEY,
          "installs" BIGINT NOT NULL DEFAULT 0,
          "browserEvents" BIGINT NOT NULL DEFAULT 0,
          "standaloneLaunches" BIGINT NOT NULL DEFAULT 0
        )
      `;
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SitePwaInstallSeen" (
          "visitorHash" CHAR(64) PRIMARY KEY,
          "seenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db.$executeRaw`
        DELETE FROM "SitePwaInstallSeen"
        WHERE "seenAt" < NOW() - INTERVAL '35 days'
      `;
    })();
  }
  try { await initialization; }
  catch (error) { initialization = null; throw error; }
}

export async function recordPwaInstall(browserId: string, source: PwaInstallSource): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("PWA analytics signing key not configured.");
  const visitorHash = createHmac("sha256", secret)
    .update("pwa-install:").update(browserId).digest("hex");
  await ensurePwaAnalyticsTables();
  return db.$transaction(async transaction => {
    const first = await transaction.$executeRaw`
      INSERT INTO "SitePwaInstallSeen" ("visitorHash", "seenAt")
      VALUES (${visitorHash}, NOW())
      ON CONFLICT ("visitorHash") DO NOTHING
    `;
    if (first === 0) return false;
    const browserEvent = source === "appinstalled" ? 1 : 0;
    const standaloneLaunch = source === "standalone" ? 1 : 0;
    await transaction.$executeRaw`
      INSERT INTO "SitePwaInstallDaily" ("day", "installs", "browserEvents", "standaloneLaunches")
      VALUES ((now() AT TIME ZONE 'Asia/Kolkata')::date, 1, ${browserEvent}, ${standaloneLaunch})
      ON CONFLICT ("day") DO UPDATE SET
        "installs" = "SitePwaInstallDaily"."installs" + 1,
        "browserEvents" = "SitePwaInstallDaily"."browserEvents" + ${browserEvent},
        "standaloneLaunches" = "SitePwaInstallDaily"."standaloneLaunches" + ${standaloneLaunch}
    `;
    return true;
  }, { maxWait: 5000, timeout: 10000 });
}

type InstallDailySummary = {
  today: bigint; last30: bigint; allTime: bigint;
  browserEventsAll: bigint; standaloneLaunchesAll: bigint;
};
type InstallPageViews = { viewsToday: bigint; views30: bigint; viewsAll: bigint };
type InstallPageVisitors = { visitorsToday: number; visitors30: number };

export async function getPwaAnalyticsSummary() {
  await Promise.all([ensureSiteAnalyticsTables(), ensurePwaAnalyticsTables()]);
  const [installRows, pageRows, visitorRows] = await Promise.all([
    db.$queryRaw<InstallDailySummary[]>`
      SELECT
        COALESCE(SUM("installs") FILTER (WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::bigint AS "today",
        COALESCE(SUM("installs") FILTER (WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29), 0)::bigint AS "last30",
        COALESCE(SUM("installs"), 0)::bigint AS "allTime",
        COALESCE(SUM("browserEvents"), 0)::bigint AS "browserEventsAll",
        COALESCE(SUM("standaloneLaunches"), 0)::bigint AS "standaloneLaunchesAll"
      FROM "SitePwaInstallDaily"
    `,
    db.$queryRaw<InstallPageViews[]>`
      SELECT
        COALESCE(SUM("pageViews") FILTER (WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::bigint AS "viewsToday",
        COALESCE(SUM("pageViews") FILTER (WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29), 0)::bigint AS "views30",
        COALESCE(SUM("pageViews"), 0)::bigint AS "viewsAll"
      FROM "SiteTrafficPages"
      WHERE "path" = '/install'
    `,
    db.$queryRaw<InstallPageVisitors[]>`
      SELECT
        COUNT(DISTINCT "visitorHash") FILTER (
          WHERE "day" = (now() AT TIME ZONE 'Asia/Kolkata')::date
        )::int AS "visitorsToday",
        COUNT(DISTINCT "visitorHash") FILTER (
          WHERE "day" >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 29
        )::int AS "visitors30"
      FROM "SiteTrafficInstallVisitorDays"
    `,
  ]);
  const installs = installRows[0];
  const page = pageRows[0];
  const visitors = visitorRows[0];

  return {
    page: {
      visitorsToday: visitors?.visitorsToday ?? 0,
      visitors30: visitors?.visitors30 ?? 0,
      viewsToday: Number(page?.viewsToday ?? 0n),
      views30: Number(page?.views30 ?? 0n),
      viewsAll: Number(page?.viewsAll ?? 0n),
    },
    installs: {
      today: Number(installs?.today ?? 0n),
      last30: Number(installs?.last30 ?? 0n),
      allTime: Number(installs?.allTime ?? 0n),
      browserEventsAll: Number(installs?.browserEventsAll ?? 0n),
      standaloneLaunchesAll: Number(installs?.standaloneLaunchesAll ?? 0n),
    },
    note: "Install-page visits and detected installs start with this update; earlier visits were grouped as Other pages and cannot be reconstructed. Installs are browser-reported installs or first observed standalone app launches, not verified downloads or exact people. Privacy opt-outs, unsupported browsers, reinstallations and separate device storage affect totals. No personal details are recorded.",
  };
}
