import { z } from "zod";
import { db } from "@/lib/db";
import { promoDestinationPathSchema } from "@/lib/site-promo-cards";

/** A dedicated, compact homepage hero promotion managed under Admin → Banners.
 * It is independent of the three rotating announcement cards.
 */
export const miniHeroOfferSchema = z.object({
  enabled: z.boolean(),
  // Existing saved banner settings predate this choice. Make the coupon the
  // exclusive default without losing previous feature copy/links.
  mode: z.enum(["coupon", "feature"]).default("coupon"),
  // Migration marker: the first simplified-coupon rollout selects coupon once;
  // afterwards admins can freely switch between coupon and feature again.
  compactCouponVersion: z.literal(2).default(2),
  eyebrow: z.string().trim().min(2).max(28),
  title: z.string().trim().min(4).max(70),
  description: z.string().trim().max(140),
  buttonText: z.string().trim().min(2).max(24),
  linkHref: promoDestinationPathSchema,
  tone: z.enum(["forest", "terracotta", "gold"]),
}).strict();
export type MiniHeroOffer = z.infer<typeof miniHeroOfferSchema>;

/** Preserve the original app-banner message as an admin-selectable option;
 * the default published hero slot now shows the coupon exclusively.
 */
export const defaultMiniHeroOffer: MiniHeroOffer = {
  enabled: true,
  mode: "coupon",
  compactCouponVersion: 2,
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
export async function getPublishedMiniHeroOffer(): Promise<MiniHeroOffer> {
  try {
    const rows = await db.$queryRaw<Array<{ settings: unknown }>>`
      SELECT "settings" FROM "SiteHeroMiniOffer" WHERE "id" = 1 LIMIT 1
    `;
    const raw = rows[0]?.settings;
    const parsed = miniHeroOfferSchema.safeParse(raw);
    if (!parsed.success) return defaultMiniHeroOffer;
    // Legacy rows include mode="feature" but predate the newly approved
    // compact coupon design. Select coupon ONCE for this requested release.
    // When an admin later publishes either mode, compactCouponVersion is
    // persisted, and all subsequent explicit choices are respected.
    const legacy = raw && typeof raw === "object" &&
      !("compactCouponVersion" in raw);
    return legacy ? { ...parsed.data, mode: "coupon" } : parsed.data;
  } catch {
    return defaultMiniHeroOffer;
  }
}

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
}
