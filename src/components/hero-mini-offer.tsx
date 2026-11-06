import Link from "next/link";
import { ArrowUpRight, Gift, Smartphone } from "lucide-react";
import { T } from "@/components/language-provider";
import type { MiniHeroOffer } from "@/lib/site-hero-mini-offer";

/** The same server-published promotion works on both site themes.
 * No client-side requests, extra JS or layout-shifting banner injections.
 */
export function HeroMiniOffer({
  offer, className = "",
}: { offer: MiniHeroOffer; className?: string }) {
  if (!offer.enabled) return null;
  return <aside className={`hero-mini-offer hero-mini-offer-${offer.tone} ${className}`.trim()} aria-label="SV Groups app and festive announcement">
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
  </aside>;
}
