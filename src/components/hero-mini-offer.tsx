import Link from "next/link";
import { ArrowUpRight, Gift, Smartphone } from "lucide-react";
import { T } from "@/components/language-provider";
import type { MiniHeroOffer } from "@/lib/site-hero-mini-offer";
import { HeroMiniSkyShots } from "@/components/hero-mini-sky-shots";
import { CouponBanner } from "@/components/coupon-banner";
import type { PublicCoupon } from "@/lib/coupon";

/**
 * Exactly ONE compact hero offer is rendered in either theme:
 * coupon mode => a standalone coupon banner with its own CTA;
 * feature mode => the preserved original admin-edited announcement.
 * Fireworks are always a decoration of the chosen banner.
 *
 * When a coupon expires/gets disabled, the coupon-mode slot is hidden
 * rather than silently restoring an unrelated Install App advertisement.
 */
export function HeroMiniOffer({
  offer, className = "", coupon = null,
}: { offer: MiniHeroOffer; className?: string; coupon?: PublicCoupon | null }) {
  if (!offer.enabled) return null;
  const couponMode = offer.mode === "coupon";
  if (couponMode && !coupon) return null;

  return (
    <aside
      className={`hero-mini-offer hero-mini-offer-${offer.tone} ${couponMode ? "hero-mini-offer-coupon" : "hero-mini-offer-feature"} ${className}`.trim()}
      aria-label={couponMode ? "SV Groups coupon offer" : "SV Groups announcement"}
    >
      <HeroMiniSkyShots/>
      {couponMode && coupon
        ? <CouponBanner coupon={coupon}/>
        : <>
          <span className="hero-mini-offer-symbol" aria-hidden="true">
            {offer.linkHref === "/install" ? <Smartphone size={19}/> : <Gift size={19}/>}
          </span>
          <div className="hero-mini-offer-copy">
            <span className="hero-mini-offer-eyebrow"><T text={offer.eyebrow}/></span>
            <strong className="hero-mini-offer-title"><T text={offer.title}/></strong>
            {offer.description && <span className="hero-mini-offer-description"><T text={offer.description}/></span>}
          </div>
          <Link href={offer.linkHref} className="hero-mini-offer-cta">
            <span><T text={offer.buttonText}/></span>
            <ArrowUpRight size={15} aria-hidden="true"/>
          </Link>
        </>
      }
    </aside>
  );
}
