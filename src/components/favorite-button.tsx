"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist-provider";
import { useLanguage } from "@/components/language-provider";
export function FavoriteButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const { has, toggle, ready } = useWishlist();
  const { t } = useLanguage();
  const selected = ready && has(id);
  return <button type="button" className={`sv-favorite-button ${compact ? "compact" : ""} ${selected ? "selected" : ""}`}
    disabled={!ready} aria-pressed={selected} aria-label={t(selected ? "Remove from favorites" : "Add to favorites")}
    title={t(selected ? "Remove from favorites" : "Add to favorites")}
    onClick={() => toggle(id)}><Heart size={compact ? 18 : 20} fill={selected ? "currentColor" : "none"} aria-hidden="true"/></button>;
}
export function WishlistNavButton() {
  const { ids, ready } = useWishlist();
  const { t } = useLanguage();
  return <Link className="sv-favorites-nav" href="/wishlist" aria-label={`${t("Favorites")}, ${ready ? ids.length : 0}`}>
    <Heart size={17} aria-hidden="true"/> <span>{t("Favorites")}</span>
    {ready && ids.length > 0 && <span className="sv-favorite-count">{ids.length > 99 ? "99+" : ids.length}</span>}
  </Link>;
}
