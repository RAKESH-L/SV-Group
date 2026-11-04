import { z } from "zod";
import { db } from "@/lib/db";

export const promoLinkOptions = [
  { value: "/catalogue", label: "Catalogue" },
  { value: "/categories", label: "Categories" },
  { value: "/contact", label: "Contact" },
  { value: "/legal-compliance", label: "Legal information" },
] as const;

const destinationSchema = z.enum(["/catalogue", "/categories", "/contact", "/legal-compliance"]);

export const promoCardSchema = z.object({
  eyebrow: z.string().trim().min(2).max(32),
  title: z.string().trim().min(4).max(54),
  description: z.string().trim().min(8).max(110),
  linkText: z.string().trim().min(2).max(24),
  linkHref: destinationSchema,
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
 * Stored in its own single-row settings table. Reading does not mutate the
 * database; a fresh installation shows safe defaults until an admin publishes.
 * This matches the existing SiteThemeSettings persistence pattern.
 */
export async function getPublishedPromoCards(): Promise<PromoCard[]> {
  try {
    const rows = await db.$queryRaw<Array<{ cards: unknown }>>`
      SELECT "cards" FROM "SitePromoCarousel" WHERE "id" = 1 LIMIT 1
    `;
    const parsed = promoCardsSchema.safeParse(rows[0]?.cards);
    return parsed.success ? parsed.data : defaultPromoCards;
  } catch {
    return defaultPromoCards;
  }
}

export async function publishPromoCards(cards: PromoCard[]): Promise<void> {
  const validated = promoCardsSchema.parse(cards);
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SitePromoCarousel" (
      "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
      "cards" JSONB NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db.$executeRaw`
    INSERT INTO "SitePromoCarousel" ("id", "cards", "updatedAt")
    VALUES (1, ${JSON.stringify(validated)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "cards" = EXCLUDED."cards", "updatedAt" = NOW()
  `;
}
