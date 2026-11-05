import { db } from "@/lib/db";

export type SiteTheme = "dark" | "light";
export type LightHeroArtwork = "crackers" | "diya";
export type SiteLogo = "ganesh" | "diamond";
export const DEFAULT_SITE_LOGO: SiteLogo = "ganesh";
export const DEFAULT_LIGHT_HERO_ARTWORK: LightHeroArtwork = "crackers";
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
 * The light theme can publish either illustration without touching the global
 * Dark/Light choice. Existing sites without the new column default to crackers.
 */
export async function getPublishedLightHeroArtwork(): Promise<LightHeroArtwork> {
  try {
    const rows = await db.$queryRaw<Array<{ lightHeroArtwork: string }>>`
      SELECT "lightHeroArtwork" FROM "SiteThemeSettings" WHERE "id" = 1 LIMIT 1
    `;
    return rows[0]?.lightHeroArtwork === "diya" ? "diya" : DEFAULT_LIGHT_HERO_ARTWORK;
  } catch {
    return DEFAULT_LIGHT_HERO_ARTWORK;
  }
}

/** Existing published logo is Ganesh unless an admin chooses Diamond. */
export async function getPublishedSiteLogo(): Promise<SiteLogo> {
  try {
    const rows = await db.$queryRaw<Array<{ logo: string }>>`
      SELECT "logo" FROM "SiteThemeSettings" WHERE "id" = 1 LIMIT 1
    `;
    return rows[0]?.logo === "diamond" ? "diamond" : DEFAULT_SITE_LOGO;
  } catch {
    // Existing databases do not yet have the optional logo column.
    return DEFAULT_SITE_LOGO;
  }
}

/**
 * Only the authenticated admin API calls this function. Creating the small
 * preference table on the first publish avoids a deployment-time migration
 * dependency and preserves all existing catalogue and enquiry tables.
 */
export async function publishSiteTheme(theme: SiteTheme, lightHeroArtwork: LightHeroArtwork = DEFAULT_LIGHT_HERO_ARTWORK, logo: SiteLogo = DEFAULT_SITE_LOGO): Promise<void> {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SiteThemeSettings" (
      "id" INTEGER PRIMARY KEY,
      "theme" TEXT NOT NULL CHECK ("theme" IN ('dark', 'light')),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Compatible with the existing optional settings table and already-published themes.
  await db.$executeRaw`
    ALTER TABLE "SiteThemeSettings"
    ADD COLUMN IF NOT EXISTS "lightHeroArtwork" TEXT NOT NULL DEFAULT 'crackers'
    CHECK ("lightHeroArtwork" IN ('crackers', 'diya'))
  `;
  await db.$executeRaw`
    ALTER TABLE "SiteThemeSettings"
    ADD COLUMN IF NOT EXISTS "logo" TEXT NOT NULL DEFAULT 'ganesh'
    CHECK ("logo" IN ('ganesh', 'diamond'))
  `;
  await db.$executeRaw`
    INSERT INTO "SiteThemeSettings" ("id", "theme", "lightHeroArtwork", "logo", "updatedAt")
    VALUES (1, ${theme}, ${lightHeroArtwork}, ${logo}, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "theme" = EXCLUDED."theme",
        "lightHeroArtwork" = EXCLUDED."lightHeroArtwork",
        "logo" = EXCLUDED."logo",
        "updatedAt" = NOW()
  `;
}
