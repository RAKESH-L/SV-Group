import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { getPublicCatalogueSnapshot, groupActiveProducts } from "@/lib/public-catalogue-data";
import { HomeCategoryCatalogue } from "@/components/home-category-catalogue";
import { business } from "@/lib/business";
import { T } from "@/components/language-provider";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";
import { SvGroupsWordmark } from "@/components/sv-groups-wordmark";
import { LightFestivalHero } from "@/components/light-festival-hero";
import { PromoCarousel } from "@/components/promo-carousel";
import { getCachedPublishedPromoCards, getCachedPublishedMiniHeroOffer } from "@/lib/public-promo-cache";
import { getPublishedLightHeroArtwork, getPublishedHeroImageUrl } from "@/lib/site-theme";
import { getActiveCoupon } from "@/lib/coupon-store";

import { HeroMiniOffer } from "@/components/hero-mini-offer";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Read public products and the small homepage settings concurrently.
  // A single short-lived catalogue snapshot is shared with the other browsing
  // pages, while admin edits immediately expire it.
  const [catalogue, promoCards, lightHeroArtwork, miniHeroOffer, heroImageUrl, coupon] = await Promise.all([
    getPublicCatalogueSnapshot().catch(() => null),
    getCachedPublishedPromoCards(),
    getPublishedLightHeroArtwork(),
    getCachedPublishedMiniHeroOffer(),
    getPublishedHeroImageUrl(),
    getActiveCoupon(),
  ]);
  const categories = catalogue ? groupActiveProducts(catalogue) : [];
  const catalogueUnavailable = catalogue === null;

  return <main>
    <PromoCarousel cards={promoCards}/>
    <LightFestivalHero artwork={lightHeroArtwork} offer={miniHeroOffer} heroImageUrl={heroImageUrl} coupon={coupon}/>
    <section className="home-contact">
      <div className="home-contact-copy">
        <div className="eyebrow"><Sparkles size={14} aria-hidden="true"/> <T text="HERE FOR YOUR CELEBRATION"/></div>
        <h1>{business.name}</h1>
        <p><T text="Thoughtful festive favourites and friendly help for your celebration, from Tumkur."/></p>
        <div className="home-contact-actions">
          <a className="contact-action" href={business.phoneHref}><span className="contact-action-icon"><Phone size={17} aria-hidden="true"/></span><span><small><T text="CALL NOW"/></small><strong>{business.phone}</strong></span><ArrowUpRight size={16} aria-hidden="true"/></a>
          <a className="contact-action" href={business.emailHref}><span className="contact-action-icon"><Mail size={17} aria-hidden="true"/></span><span><small><T text="EMAIL US"/></small><strong>{business.email}</strong></span><ArrowUpRight size={16} aria-hidden="true"/></a>
          <div className="home-location"><MapPin size={16} aria-hidden="true"/><span><small><T text="BASED IN"/></small><strong>{business.address}</strong></span></div>
        </div>
      </div>
      <div className="home-contact-art" aria-hidden="true"><SvGroupsWordmark className="sv-wordmark-hero"/></div>
    </section>

    <HomeCategoryCatalogue categories={categories} unavailable={catalogueUnavailable}/>

    <section className="hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><HeroMiniOffer offer={miniHeroOffer} className="dark-hero-mini-offer" coupon={coupon}/><div className="hero-content"><div className="eyebrow"><Sparkles size={14} aria-hidden="true"/> <T text="THE DIWALI COLLECTION · EST. WITH CARE"/></div><h2><T text="Make room"/><br/><T text="for a little"/> <em><T text="magic."/></em></h2><p><T text="Thoughtfully chosen favourites for moments that bring everyone together. Explore, compare and plan your celebration."/></p><div className="hero-actions"><Link href="/catalogue" className="button button-gold"><T text="Explore the catalogue"/> <ArrowUpRight size={16}/></Link><Link href="/contact" className="button button-outline"><T text="Talk to our team"/></Link></div><div className="hero-note"><span className="gold-dot"/> <T text="A considered collection for a brighter celebration"/></div></div><div className="hero-art"><div className="art-frame"><div className="art-glow"/><div className="diya"><div className="flame"/><div className="wick"/><div className="bowl"><div className="oil"/></div><div className="dish"/></div><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-spark s1">✦</div><div className="art-spark s2">✧</div><div className="art-spark s3">✦</div><div className="art-caption">LIGHT · JOY · TOGETHERNESS</div></div></div><a href="#collection" className="scroll-cue"><T text="DISCOVER THE COLLECTION"/> <ArrowDownRight size={17} aria-hidden="true"/></a></section>

    <section className="intro-band"><div><span><T text="01 / OUR PROMISE"/></span><p><T text="Celebration with"/> <em><T text="intention."/></em></p></div><p><T text="Beautifully curated festive favourites, easy-to-understand pricing and a team ready to help with general questions. Simple, thoughtful, and made for the moments you remember."/></p><div className="intro-stat"><strong>{String(categories.length).padStart(2, "0")}</strong><span><T text="Collections"/></span></div></section>

    <section className="cta-band"><div className="cta-flower" aria-hidden="true">✳</div><div><div className="eyebrow"><T text="WE’RE HERE TO HELP"/></div><h2><T text="A question about"/><br/><em><T text="collection?"/></em></h2></div><Link href="/contact" className="button button-gold"><T text="Get in touch"/> <ArrowUpRight size={16} aria-hidden="true"/></Link></section>
    <section className="legal-home-section"><div className="legal-home-intro"><span className="eyebrow"><T text="CLEAR INFORMATION · RESPONSIBLE BROWSING"/></span><p><T text="Important information about this catalogue."/></p></div><LegalComplianceNotice/></section>
  </main>;
}
