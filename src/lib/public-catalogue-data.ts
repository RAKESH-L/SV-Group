import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { ProductView } from "@/components/product-card";

export const PUBLIC_CATALOGUE_TAG = "sv-public-catalogue";

export type PublicCategory = { id: string; name: string; slug: string };
export type PublicCatalogueSnapshot = {
  products: ProductView[];
  categories: PublicCategory[];
};

/**
 * Shared, short-lived public catalogue snapshot for Home, Catalogue,
 * Categories and Favorites. Query only the fields the cards actually render.
 *
 * All published prices and availability are revalidated on admin mutations.
 * Even if invalidation fails, the 45-second TTL bounds stale public data.
 * Customer cart/estimate state and all admin/private data remain uncached.
 */
const readPublicCatalogue = unstable_cache(
  async (): Promise<PublicCatalogueSnapshot> => {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { active: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true, name: true, slug: true, description: true,
          imageUrl: true, originalPrice: true, discountedPrice: true,
          availability: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      db.category.findMany({
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true, slug: true },
      }),
    ]);
    return {
      products: products.map(product => ({
        ...product,
        originalPrice: Number(product.originalPrice),
        discountedPrice: Number(product.discountedPrice),
      })),
      categories,
    };
  },
  ["sv-public-catalogue-v1"],
  { tags: [PUBLIC_CATALOGUE_TAG], revalidate: 45 },
);

export function getPublicCatalogueSnapshot() {
  return readPublicCatalogue();
}

/** Call only AFTER a successful admin write, never for public visitors. */
export function invalidatePublicCatalogue() {
  try {
    // Immediate expiry: the next request must load updated catalogue data
    // rather than serving the previous price or inventory state.
    revalidateTag(PUBLIC_CATALOGUE_TAG, { expire: 0 });
  } catch (error) {
    console.error("Public catalogue cache invalidation failed", error);
  }
}

export function groupActiveProducts(snapshot: PublicCatalogueSnapshot) {
  const groups = new Map<string, ProductView[]>();
  for (const product of snapshot.products) {
    const previous = groups.get(product.category.slug);
    if (previous) previous.push(product);
    else groups.set(product.category.slug, [product]);
  }
  return snapshot.categories.flatMap(category => {
    const products = groups.get(category.slug) || [];
    return products.length ? [{ ...category, products }] : [];
  });
}
