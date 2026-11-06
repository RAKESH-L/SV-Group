"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ArrowUpRight, Trash2, Share2, MessageCircle, Plus } from "lucide-react";
import type { ProductView } from "@/components/product-card";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { useLanguage } from "@/components/language-provider";
import { shareInformationText, openWhatsAppQuestion, makeProductTopicsText } from "@/lib/selection-sharing";

export function WishlistClient({ products }: { products: ProductView[] }) {
  const { ids, ready, clear } = useWishlist();
  const { setQuantity } = useCart();
  const { t } = useLanguage();
  const [notice, setNotice] = useState("");
  const shown = useMemo(() => products.filter(p => ids.includes(p.id)), [products, ids]);
  const missing = Math.max(0, ids.length - shown.length);
  const infoText = makeProductTopicsText(shown.map(product => ({ name: product.name, quantity: 1 })), "Saved favorites");
  function addToCalculator() {
    for (const product of shown) setQuantity(product, 1);
    setNotice("Available favorites were added to the personal price calculator.");
  }
  async function share() {
    const result = await shareInformationText(infoText);
    if (result === "copied") setNotice("Favorite list copied. You can paste it into a message.");
    else if (result === "unavailable") setNotice("Sharing isn't available in this browser.");
  }
  return <section className="wishlist-page-content">
    {!ready ? <p role="status">Loading your favorites…</p> : shown.length ? <>
      <div className="wishlist-actions">
        <span>{shown.length} {t("saved products")} · {t("stored on this device")}</span>
        <div>
          <button className="button button-outline" onClick={() => void share()}><Share2 size={15}/>{t("Share Favorites")}</button>
          <button className="button button-outline" onClick={() => openWhatsAppQuestion(infoText)}><MessageCircle size={15}/>{t("Ask on WhatsApp")}</button>
          <button className="button button-gold" onClick={addToCalculator}><Plus size={15}/>{t("Add to Calculator")}</button>
          <button className="button button-outline" onClick={() => { if (confirm("Remove all your favorites from this device?")) clear(); }}><Trash2 size={15}/>{t("Clear Favorites")}</button>
        </div>
      </div>
      {missing > 0 && <p className="sv-feature-notice" role="status">{missing} previously saved item(s) are no longer visible in the active catalogue. You can clear your favorites to remove them.</p>}
      {notice && <p className="sv-feature-notice" role="status">{notice}</p>}
      <div className="product-grid">{shown.map(product => <ProductCard key={product.id} product={product}/>)}</div>
    </> : <div className="empty-state">
      <Heart size={32} aria-hidden="true"/>
      <h2>{t("Your favorites are empty")}</h2>
      <p>{t("Tap the heart on any product to save it here for later.")}</p>
      {missing > 0 && <button className="button button-outline" onClick={clear}>Remove unavailable saved items</button>}
      <Link href="/catalogue" className="button button-gold">{t("Browse catalogue")} <ArrowUpRight size={16}/></Link>
    </div>}
    <p className="sv-feature-footnote">Favorites are saved only in this browser. Prices and availability are loaded from the current public catalogue and may change. This page does not accept orders or bookings.</p>
  </section>;
}
