import { db } from "@/lib/db";

export type SiteTheme = "dark" | "light";
const DEFAULT_THEME: SiteTheme = "dark";

/**
 * Single published theme for the whole site. A missing preference (including
 * projects that have never published a choice) preserves the original dark theme.
 */
export async function getPublishedSiteTheme(): Promise<SiteTheme> {
  try {
    const rows = await db.$queryRaw<Array<{ theme: string }>>`
      SELECT "theme" FROM "SiteThemeSettings" WHERE "id" = 1 LIMIT 1
    `;
    return rows[0]?.theme === "light" ? "light" : DEFAULT_THEME;
  } catch {
    // A fresh database may not have its optional preferences table yet.
    // Public pages remain available with the original dark styling.
    return DEFAULT_THEME;
  }
}

/**
 * Only the authenticated admin API calls this function. Creating the small
 * preference table on the first publish avoids a deployment-time migration
 * dependency and preserves all existing catalogue and enquiry tables.
 */
export async function publishSiteTheme(theme: SiteTheme): Promise<void> {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SiteThemeSettings" (
      "id" INTEGER PRIMARY KEY,
      "theme" TEXT NOT NULL CHECK ("theme" IN ('dark', 'light')),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db.$executeRaw`
    INSERT INTO "SiteThemeSettings" ("id", "theme", "updatedAt")
    VALUES (1, ${theme}, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "theme" = EXCLUDED."theme", "updatedAt" = NOW()
  `;
}
