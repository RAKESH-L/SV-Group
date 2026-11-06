import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { promoDestinationPathSchema } from "@/lib/site-promo-cards";

/** A dedicated, compact homepage hero promotion managed under Admin → Banners.
 * It is independent of the three rotating announcement cards.
 */
export const miniHeroOfferSchema = z.object({
  enabled: z.boolean(),
  eyebrow: z.string().trim().min(2).max(28),
  title: z.string().trim().min(4).max(70),
  description: z.string().trim().max(140),
  buttonText: z.string().trim().min(2).max(24),
  linkHref: promoDestinationPathSchema,
  tone: z.enum(["forest", "terracotta", "gold"]),
}).strict();
export type MiniHeroOffer = z.infer<typeof miniHeroOfferSchema>;

/** Show a small, truthful install invitation on first deployment.
 * No invented discounts, purchases or exclusive-app entitlement.
 */
export const defaultMiniHeroOffer: MiniHeroOffer = {
  enabled: true,
  eyebrow: "SV GROUPS ON YOUR PHONE",
  title: "Your festive favourites, one tap away",
  description: "Install our app for quick access to the catalogue and latest offers.",
  buttonText: "Install App",
  linkHref: "/install",
  tone: "forest",
};

/** Render safely if the optional settings table is absent or temporarily down.
 * Reads do not create or alter tables, and the public homepage never fails
 * because of promotion configuration.
 */
export const getPublishedMiniHeroOffer = unstable_cache(async (): Promise<MiniHeroOffer> {
  try {
    const rows = await db.$queryRaw<Array<{ settings: unknown }>>`
      SELECT "settings" FROM "SiteHeroMiniOffer" WHERE "id" = 1 LIMIT 1
    `;
    const parsed = miniHeroOfferSchema.safeParse(rows[0]?.settings);
    return parsed.success ? parsed.data : defaultMiniHeroOffer;
  } catch {
    return defaultMiniHeroOffer;
  }
}, ["sv-mini-hero-offer-v1"], { tags: ["sv-mini-hero-offer"], revalidate: 60 });

/** A save writes one complete validated config; no migrations or new services. */
export async function publishMiniHeroOffer(value: MiniHeroOffer): Promise<void> {
  const validated = miniHeroOfferSchema.parse(value);
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SiteHeroMiniOffer" (
      "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
      "settings" JSONB NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db.$executeRaw`
    INSERT INTO "SiteHeroMiniOffer" ("id", "settings", "updatedAt")
    VALUES (1, ${JSON.stringify(validated)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "settings" = EXCLUDED."settings",
        "updatedAt" = NOW()
  `;
  try { revalidateTag("sv-mini-hero-offer", { expire: 0 }); }
  catch (error) { console.error("Could not invalidate public banner settings", error); }
}
