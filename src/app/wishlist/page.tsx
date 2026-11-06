import { db } from "@/lib/db";
import { WishlistClient } from "@/components/wishlist-client";
import type { ProductView } from "@/components/product-card";
import type { Metadata } from "next";
import { T } from "@/components/language-provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favorites | SV Groups" };
export default async function WishlistPage() {
  let products: ProductView[] = [];
  try {
    const rows = await db.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    products = rows.map(row => ({
      id: row.id, name: row.name, slug: row.slug, description: row.description,
      imageUrl: row.imageUrl, originalPrice: Number(row.originalPrice),
      discountedPrice: Number(row.discountedPrice), availability: row.availability,
      category: { name: row.category.name, slug: row.category.slug },
    }));
  } catch { /* Keep wishlist page usable if catalogue briefly fails. */ }
  return <main className="page-shell">
    <div className="eyebrow"><T text="SAVED ON THIS DEVICE"/></div>
    <h1 className="page-title"><T text="Your" /> <em><T text="Favorites"/></em></h1>
    <p className="page-lede"><T text="Keep products you like in one place, then explore, compare or ask our team about them."/></p>
    <WishlistClient products={products}/>
  </main>;
}
