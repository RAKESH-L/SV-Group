import { unstable_cache } from "next/cache";
import { getPublishedPromoCards } from "@/lib/site-promo-cards";
import { getPublishedMiniHeroOffer } from "@/lib/site-hero-mini-offer";

/**
 * Server-only public cache layer. The original schema/default settings
 * modules stay importable by client admin editors without bundling next/cache.
 * Admin route handlers expire these tags after a successful publish.
 */
export const getCachedPublishedPromoCards = unstable_cache(
  getPublishedPromoCards,
  ["sv-promo-cards-v1"],
  { tags: ["sv-promo-cards"], revalidate: 60 },
);

export const getCachedPublishedMiniHeroOffer = unstable_cache(
  getPublishedMiniHeroOffer,
  ["sv-mini-hero-offer-v2"],
  { tags: ["sv-mini-hero-offer"], revalidate: 60 },
);
