import { getPublicCatalogueSnapshot } from "@/lib/public-catalogue-data";
import { WishlistClient } from "@/components/wishlist-client";
import type { Metadata } from "next";
import { T } from "@/components/language-provider";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favorites | SV Groups" };
export default async function WishlistPage() {
  const snapshot = await getPublicCatalogueSnapshot().catch(() => null);
  const products = snapshot?.products || [];

  return <main className="page-shell">
    <div className="eyebrow"><T text="SAVED ON THIS DEVICE"/></div>
    <h1 className="page-title"><T text="Your" /> <em><T text="Favorites"/></em></h1>
    <p className="page-lede"><T text="Keep products you like in one place, then explore, compare or ask our team about them."/></p>
    <WishlistClient products={products}/>
  </main>;
}
