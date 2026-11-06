import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

/** Built-in public routes for banner buttons. More can be added by admins. */
export const promoLinkOptions = [
  { value: "/", label: "Homepage" },
  { value: "/catalogue", label: "Full catalogue" },
  { value: "/categories", label: "Categories" },
  { value: "/cart", label: "Price Calculator" },
  { value: "/contact", label: "Contact" },
  { value: "/install", label: "Install App" },
  { value: "/wishlist", label: "Favorites" },
  { value: "/notifications", label: "Notifications" },
  { value: "/developer", label: "Website Developer" },
  { value: "/legal-compliance", label: "Legal information" },
  { value: "/privacy", label: "Privacy notice" },
] as const;

/**
 * Banner links must stay on public pages of this website.
 * No external URLs, query strings, fragments, protocol-relative URLs,
 * path traversal, encoded characters, or private/admin/API routes.
 */
export function isSafePromoPath(value: string): boolean {
  if (value === "/") return true;
  if (value.length > 120 || !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/.test(value)) return false;
  const firstSegment = value.split("/")[1];
  return !["admin", "api", "auth", "_next", "internal", "logout", "offline"].includes(firstSegment);
}
export const promoDestinationPathSchema = z.string().trim().min(1).max(120).refine(
  isSafePromoPath,
  "Enter a safe public page path, such as /install or /developer. External links and admin pages are not allowed.",
);

export const customPromoDestinationSchema = z.object({
  value: promoDestinationPathSchema,
  label: z.string().trim().min(2).max(48),
}).strict();

export const customPromoDestinationsSchema = z.array(customPromoDestinationSchema)
  .max(30)
  .superRefine((destinations, ctx) => {
    const names = new Set<string>(promoLinkOptions.map(target => target.value));
    for (const [i, destination] of destinations.entries()) {
      if (names.has(destination.value)) {
        ctx.addIssue({ code: "custom", message: "A destination with this path already exists.", path: [i, "value"] });
      }
      names.add(destination.value);
    }
  });

export type PromoDestination = z.infer<typeof customPromoDestinationSchema>;

export const promoCardSchema = z.object({
  eyebrow: z.string().trim().min(2).max(32),
  title: z.string().trim().min(4).max(54),
  description: z.string().trim().min(8).max(110),
  linkText: z.string().trim().min(2).max(24),
  linkHref: promoDestinationPathSchema,
}).strict();
export const promoCardsSchema = z.array(promoCardSchema).length(3);
export type PromoCard = z.infer<typeof promoCardSchema>;

export const defaultPromoCards: PromoCard[] = [
  {
    eyebrow: "FESTIVAL SAVINGS",
    title: "Ask about 10% savings",
    description: "Ask our team about possible savings and current indicative catalogue prices.",
    linkText: "View catalogue",
    linkHref: "/catalogue",
  },
  {
    eyebrow: "A LITTLE SPARKLE",
    title: "Make moments magical",
    description: "Explore thoughtfully selected festive favourites for bright celebrations.",
    linkText: "Explore categories",
    linkHref: "/categories",
  },
  {
    eyebrow: "HERE TO HELP",
    title: "Celebrate with confidence",
    description: "Friendly guidance, clear product details and a welcoming local team.",
    linkText: "Contact our team",
    linkHref: "/contact",
  },
];

/**
 * Existing installations can read their published cards before any optional
 * destination column exists. All reads are non-mutating and fail to safe
 * defaults when database settings are unavailable.
 */
export const getPublishedPromoCards = unstable_cache(async (): Promise<PromoCard[]> {
  try {
    const rows = await db.$queryRaw<Array<{ cards: unknown }>>`
      SELECT "cards" FROM "SitePromoCarousel" WHERE "id" = 1 LIMIT 1
    `;
    const parsed = promoCardsSchema.safeParse(rows[0]?.cards);
    return parsed.success ? parsed.data : defaultPromoCards;
  } catch {
    return defaultPromoCards;
  }
}, ["sv-promo-cards-v1"], { tags: ["sv-promo-cards"], revalidate: 60 });

export async function getPublishedCustomPromoDestinations(): Promise<PromoDestination[]> {
  try {
    const rows = await db.$queryRaw<Array<{ destinations: unknown }>>`
      SELECT "destinations" FROM "SitePromoCarousel" WHERE "id" = 1 LIMIT 1
    `;
    const parsed = customPromoDestinationsSchema.safeParse(rows[0]?.destinations);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/**
 * Validate complete banner settings as a unit. Admins cannot remove a custom
 * destination while any card still points to it. Built-in routes stay visible.
 */
export function validatePromoSettings(cards: PromoCard[], destinations: PromoDestination[]): void {
  const validPaths = new Set<string>([
    ...promoLinkOptions.map(target => target.value),
    ...destinations.map(target => target.value),
  ]);
  if (cards.some(card => !validPaths.has(card.linkHref))) {
    throw new Error("A card uses a destination that was removed or is not registered.");
  }
}

export async function publishPromoCards(cards: PromoCard[], destinations: PromoDestination[] = []): Promise<void> {
  const validated = promoCardsSchema.parse(cards);
  const validatedDestinations = customPromoDestinationsSchema.parse(destinations);
  validatePromoSettings(validated, validatedDestinations);
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SitePromoCarousel" (
      "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
      "cards" JSONB NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Extend existing banner settings without a Prisma schema migration.
  await db.$executeRaw`
    ALTER TABLE "SitePromoCarousel"
    ADD COLUMN IF NOT EXISTS "destinations" JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  // Publish cards and their allowed paths atomically in the same row.
  await db.$executeRaw`
    INSERT INTO "SitePromoCarousel" ("id", "cards", "destinations", "updatedAt")
    VALUES (1, ${JSON.stringify(validated)}::jsonb, ${JSON.stringify(validatedDestinations)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "cards" = EXCLUDED."cards",
        "destinations" = EXCLUDED."destinations",
        "updatedAt" = NOW()
  `;
  try { revalidateTag("sv-promo-cards", { expire: 0 }); }
  catch (error) { console.error("Could not invalidate public banner settings", error); }
}
