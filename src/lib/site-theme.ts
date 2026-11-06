import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type SiteTheme = "dark" | "light";
export type LightHeroArtwork = "crackers" | "diya" | "deepavali";
export type SiteLogo = "ganesh" | "diamond";
export const DEFAULT_SITE_LOGO: SiteLogo = "ganesh";
export const DEFAULT_LIGHT_HERO_ARTWORK: LightHeroArtwork = "crackers";
const DEFAULT_THEME: SiteTheme = "dark";

export type PublishedSitePreferences = {
  theme: SiteTheme; lightHeroArtwork: LightHeroArtwork; logo: SiteLogo; heroImageUrl: string | null;
};

const defaults: PublishedSitePreferences = {
  theme: DEFAULT_THEME,
  lightHeroArtwork: DEFAULT_LIGHT_HERO_ARTWORK,
  logo: DEFAULT_SITE_LOGO,
  heroImageUrl: null,
};

/**
 * One tiny settings query instead of separate logo/theme/artwork calls on
 * every page. to_jsonb gracefully handles older database schema versions
 * without the optional logo or artwork columns.
 *
 * Data stays cached for at most 60 seconds, and admin publishing expires it
 * immediately across requests. The React cache shares the read within one
 * request (layout, metadata, homepage) with no change to UI.
 */
const cachedPreferences = unstable_cache(async (): Promise<PublishedSitePreferences> => {
  try {
    const rows = await db.$queryRaw<Array<{ settings: unknown }>>`
      SELECT to_jsonb(settings) AS "settings"
      FROM "SiteThemeSettings" AS settings
      WHERE "id" = 1 LIMIT 1
    `;
    const data = rows[0]?.settings;
    if (!data || typeof data !== "object") return defaults;
    const record = data as Record<string, unknown>;
    return {
      theme: record.theme === "light" ? "light" : DEFAULT_THEME,
      logo: record.logo === "diamond" ? "diamond" : DEFAULT_SITE_LOGO,
      lightHeroArtwork: record.heroArtworkSelection === "deepavali" ? "deepavali" : record.heroArtworkSelection === "diya" || record.lightHeroArtwork === "diya" && record.heroArtworkSelection !== "crackers" ? "diya" : DEFAULT_LIGHT_HERO_ARTWORK,
      heroImageUrl: typeof record.heroImageUrl === "string" && /^https:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\/hero-artwork\/[0-9a-f-]{36}\.png$/i.test(record.heroImageUrl) ? record.heroImageUrl : null,
    };
  } catch {
    return defaults;
  }
}, ["sv-site-preferences-v1"], { tags: ["sv-site-preferences"], revalidate: 60 });

export const getPublishedSitePreferences = cache(cachedPreferences);

export async function getPublishedSiteTheme(): Promise<SiteTheme> {
  return (await getPublishedSitePreferences()).theme;
}
export async function getPublishedLightHeroArtwork(): Promise<LightHeroArtwork> {
  return (await getPublishedSitePreferences()).lightHeroArtwork;
}
export async function getPublishedSiteLogo(): Promise<SiteLogo> {
  return (await getPublishedSitePreferences()).logo;
}
export async function getPublishedHeroImageUrl(): Promise<string | null> {
  return (await getPublishedSitePreferences()).heroImageUrl;
}

/** Admin-only publishing keeps the existing table and current theme/logo. */
export async function publishSiteTheme(theme: SiteTheme, lightHeroArtwork: LightHeroArtwork = DEFAULT_LIGHT_HERO_ARTWORK, logo: SiteLogo = DEFAULT_SITE_LOGO, heroImageUrl: string | null = null): Promise<void> {
  if (lightHeroArtwork === "deepavali" && !heroImageUrl) throw new Error("A verified approved Deepavali image is required before publishing.");
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
    ALTER TABLE "SiteThemeSettings"
    ADD COLUMN IF NOT EXISTS "heroArtworkSelection" TEXT NOT NULL DEFAULT 'crackers'
  `;
  await db.$executeRaw`
    ALTER TABLE "SiteThemeSettings"
    ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT
  `;
  // Keep the original artwork column and its legacy CHECK constraint valid.
  const legacyArtwork = lightHeroArtwork === "deepavali" ? "crackers" : lightHeroArtwork;
  await db.$executeRaw`
    INSERT INTO "SiteThemeSettings" ("id", "theme", "lightHeroArtwork", "heroArtworkSelection", "heroImageUrl", "logo", "updatedAt")
    VALUES (1, ${theme}, ${legacyArtwork}, ${lightHeroArtwork}, ${heroImageUrl}, ${logo}, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "theme" = EXCLUDED."theme",
        "lightHeroArtwork" = EXCLUDED."lightHeroArtwork",
        "heroArtworkSelection" = EXCLUDED."heroArtworkSelection",
        "heroImageUrl" = COALESCE(EXCLUDED."heroImageUrl", "SiteThemeSettings"."heroImageUrl"),
        "logo" = EXCLUDED."logo",
        "updatedAt" = NOW()
  `;
  try { revalidateTag("sv-site-preferences", { expire: 0 }); }
  catch (error) { console.error("Could not invalidate published site settings", error); }
}
