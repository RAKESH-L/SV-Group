import { cache } from "react";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type SiteTheme = "dark" | "light";
export type LightHeroArtwork = "crackers" | "diya" | "deepavali";
export type SiteLogo = "ganesh" | "diamond";
export const DEFAULT_SITE_LOGO: SiteLogo = "ganesh";
export const DEFAULT_LIGHT_HERO_ARTWORK: LightHeroArtwork = "crackers";
const DEFAULT_THEME: SiteTheme = "dark";

/**
 * The exact, user-approved Happy Deepavali PNG (1122 × 1402, 1,950,775 bytes).
 * Existing copies uploaded through the authenticated artwork uploader are
 * stored without re-encoding. Pin to this fingerprint: do NOT substitute a
 * visually similar image or alter its brightness, colours or lettering.
 */
const APPROVED_DEEPAVALI_SHA256 = "4cfe51cc1cdeb00e35d1ecbea88b17ec66a9303e17328998e1d4d79f2c232c10";
const APPROVED_DEEPAVALI_BYTES = 1_950_775;
const HERO_SELECTION_VERSION = 2;

export type PublishedSitePreferences = {
  theme: SiteTheme;
  lightHeroArtwork: LightHeroArtwork;
  logo: SiteLogo;
  heroImageUrl: string | null;
};

const defaults: PublishedSitePreferences = {
  theme: DEFAULT_THEME,
  lightHeroArtwork: DEFAULT_LIGHT_HERO_ARTWORK,
  logo: DEFAULT_SITE_LOGO,
  heroImageUrl: null,
};

function artworkFromRecord(record: Record<string, unknown>): LightHeroArtwork {
  if (record.heroArtworkSelection === "deepavali") return "deepavali";
  if (record.heroArtworkSelection === "diya" ||
      (record.lightHeroArtwork === "diya" && record.heroArtworkSelection !== "crackers")) return "diya";
  return "crackers";
}

/** Strictly validate a public hero object in this site's own Supabase bucket. */
export function allowedHeroUrl(value: string): boolean {
  try {
    const endpoint = process.env.SUPABASE_URL;
    if (!endpoint) return false;
    const source = new URL(value);
    const storageOrigin = new URL(endpoint);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    const prefix = `/storage/v1/object/public/${bucket}/hero-artwork/`;
    const filename = source.pathname.startsWith(prefix) ? source.pathname.slice(prefix.length) : "";
    return source.protocol === "https:"
      && source.origin === storageOrigin.origin
      && !source.search && !source.hash
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i.test(filename);
  } catch { return false; }
}

/**
 * One-time rollout: find the PNG the owner already uploaded, using its exact
 * SHA256 rather than guessing a storage URL or making the owner upload again.
 * Download is server-side only; no secret or personal data reaches the client.
 */
async function findAlreadyUploadedApprovedHero(): Promise<string | null> {
  const endpoint = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!endpoint || !secret) return null;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  const supabase = createClient(endpoint, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const storage = supabase.storage.from(bucketName);
  const { data, error } = await storage.list("hero-artwork", {
    limit: 100, sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return null;
  for (const candidate of data) {
    if (!/^[0-9a-f-]{36}\.png$/i.test(candidate.name)) continue;
    const reportedBytes = Number(candidate.metadata?.size);
    if (reportedBytes > 0 && reportedBytes !== APPROVED_DEEPAVALI_BYTES) continue;
    const path = `hero-artwork/${candidate.name}`;
    const { data: file, error: downloadError } = await storage.download(path);
    if (downloadError || !file || file.size !== APPROVED_DEEPAVALI_BYTES) continue;
    const digest = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
    if (digest === APPROVED_DEEPAVALI_SHA256) {
      const url = storage.getPublicUrl(path).data.publicUrl;
      return allowedHeroUrl(url) ? url : null;
    }
  }
  return null;
}

/**
 * The admin's previously uploaded asset is selected once by this release.
 * Version=2 means the initial selection has already happened, so every later
 * admin selection is respected and never overwritten by the rollout.
 */
async function activateApprovedHeroOnce(record: Record<string, unknown>) {
  if (record.heroSelectionVersion === HERO_SELECTION_VERSION) return null;
  // Preview builds must never modify the live site's public appearance.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return null;
  try {
    const url = await findAlreadyUploadedApprovedHero();
    if (!url) {
      console.warn("Approved Deepavali hero was not found in existing image storage; preserving current artwork.");
      return null;
    }
    await db.$executeRaw`
      ALTER TABLE "SiteThemeSettings"
      ADD COLUMN IF NOT EXISTS "heroSelectionVersion" INTEGER NOT NULL DEFAULT 0
    `;
    const changed = await db.$executeRaw`
      UPDATE "SiteThemeSettings"
      SET "heroArtworkSelection" = 'deepavali',
          "lightHeroArtwork" = 'crackers',
          "heroImageUrl" = ${url},
          "heroSelectionVersion" = ${HERO_SELECTION_VERSION},
          "updatedAt" = NOW()
      WHERE "id" = 1 AND "heroSelectionVersion" <> ${HERO_SELECTION_VERSION}
    `;
    return changed ? url : null;
  } catch (error) {
    console.error("Could not activate approved Deepavali hero; preserving current appearance.", error);
    return null;
  }
}

/**
 * A small, short-lived shared snapshot for site, admin, metadata and homepage.
 * Deployment chooses the already-approved artwork automatically. Later admin
 * switches persist independently and do not require any file uploads.
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
    let record = data as Record<string, unknown>;
    if (record.heroSelectionVersion !== HERO_SELECTION_VERSION) {
      const activated = await activateApprovedHeroOnce(record);
      if (activated) {
        record = { ...record, heroArtworkSelection: "deepavali", heroImageUrl: activated, heroSelectionVersion: HERO_SELECTION_VERSION };
      } else {
        // Concurrent admin publishes take precedence over any first-load rollout.
        const current = await db.$queryRaw<Array<{ settings: unknown }>>`
          SELECT to_jsonb(settings) AS "settings" FROM "SiteThemeSettings" AS settings WHERE "id" = 1 LIMIT 1
        `;
        if (current[0]?.settings && typeof current[0].settings === "object") {
          record = current[0].settings as Record<string, unknown>;
        }
      }
    }
    const heroImageUrl = typeof record.heroImageUrl === "string" && allowedHeroUrl(record.heroImageUrl)
      ? record.heroImageUrl : null;
    return {
      theme: record.theme === "light" ? "light" : DEFAULT_THEME,
      logo: record.logo === "diamond" ? "diamond" : DEFAULT_SITE_LOGO,
      lightHeroArtwork: artworkFromRecord(record),
      heroImageUrl,
    };
  } catch (error) {
    console.error("Could not load published site preferences", error);
    return defaults;
  }
}, ["sv-site-preferences-v2"], { tags: ["sv-site-preferences"], revalidate: 60 });

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

/** All subsequent appearance changes are admin-controlled. */
export async function publishSiteTheme(
  theme: SiteTheme,
  lightHeroArtwork: LightHeroArtwork = DEFAULT_LIGHT_HERO_ARTWORK,
  logo: SiteLogo = DEFAULT_SITE_LOGO,
  heroImageUrl: string | null = null,
): Promise<void> {
  if (lightHeroArtwork === "deepavali" && !heroImageUrl) {
    throw new Error("The approved Deepavali illustration is not available.");
  }
  if (heroImageUrl && !allowedHeroUrl(heroImageUrl)) throw new Error("Invalid approved hero URL.");
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SiteThemeSettings" (
      "id" INTEGER PRIMARY KEY,
      "theme" TEXT NOT NULL CHECK ("theme" IN ('dark', 'light')),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
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
    ALTER TABLE "SiteThemeSettings" ADD COLUMN IF NOT EXISTS "heroArtworkSelection" TEXT NOT NULL DEFAULT 'crackers'
  `;
  await db.$executeRaw`
    ALTER TABLE "SiteThemeSettings" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT
  `;
  await db.$executeRaw`
    ALTER TABLE "SiteThemeSettings" ADD COLUMN IF NOT EXISTS "heroSelectionVersion" INTEGER NOT NULL DEFAULT 0
  `;
  // The legacy artwork column retains its original constraint.
  const legacyArtwork = lightHeroArtwork === "deepavali" ? "crackers" : lightHeroArtwork;
  await db.$executeRaw`
    INSERT INTO "SiteThemeSettings"
      ("id", "theme", "lightHeroArtwork", "heroArtworkSelection", "heroImageUrl", "heroSelectionVersion", "logo", "updatedAt")
    VALUES (1, ${theme}, ${legacyArtwork}, ${lightHeroArtwork}, ${heroImageUrl}, ${HERO_SELECTION_VERSION}, ${logo}, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "theme" = EXCLUDED."theme",
        "lightHeroArtwork" = EXCLUDED."lightHeroArtwork",
        "heroArtworkSelection" = EXCLUDED."heroArtworkSelection",
        "heroImageUrl" = COALESCE(EXCLUDED."heroImageUrl", "SiteThemeSettings"."heroImageUrl"),
        "heroSelectionVersion" = EXCLUDED."heroSelectionVersion",
        "logo" = EXCLUDED."logo",
        "updatedAt" = NOW()
  `;
  try { revalidateTag("sv-site-preferences", { expire: 0 }); }
  catch (error) { console.error("Could not invalidate published site settings", error); }
}
