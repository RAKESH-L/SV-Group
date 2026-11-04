import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { HomeCategoryCatalogue, type HomeProductCategory } from "@/components/home-category-catalogue";
import { business } from "@/lib/business";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";
import { SvGroupsWordmark } from "@/components/sv-groups-wordmark";
import { LightFestivalHero } from "@/components/light-festival-hero";

export const dynamic = "force-dynamic";

export default async function Home() {
  let categories: HomeProductCategory[] = [];
  let catalogueUnavailable = false;
  try {
    const rows = await db.category.findMany({
      where: { products: { some: { active: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          where: { active: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            originalPrice: true,
            discountedPrice: true,
            availability: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });

    categories = rows.map(category => ({
      ...category,
      products: category.products.map(product => ({
        ...product,
        originalPrice: Number(product.originalPrice),
        discountedPrice: Number(product.discountedPrice),
      })),
    }));
  } catch {
    // Keep the public home page available if the catalogue database is temporarily unavailable.
    catalogueUnavailable = true;
  }

  return <main>
    <LightFestivalHero/>
    <section className="home-contact">
      <div className="home-contact-copy">
        <div className="eyebrow"><Sparkles size={14} aria-hidden="true"/> HERE FOR YOUR CELEBRATION</div>
        <h1>{business.name}</h1>
        <p>Thoughtful festive favourites and friendly help for your celebration, from Tumkur.</p>
        <div className="home-contact-actions">
          <a className="contact-action" href={business.phoneHref}><span className="contact-action-icon"><Phone size={17} aria-hidden="true"/></span><span><small>CALL NOW</small><strong>{business.phone}</strong></span><ArrowUpRight size={16} aria-hidden="true"/></a>
          <a className="contact-action" href={business.emailHref}><span className="contact-action-icon"><Mail size={17} aria-hidden="true"/></span><span><small>EMAIL US</small><strong>{business.email}</strong></span><ArrowUpRight size={16} aria-hidden="true"/></a>
          <div className="home-location"><MapPin size={16} aria-hidden="true"/><span><small>BASED IN</small><strong>{business.address}</strong></span></div>
        </div>
      </div>
      <div className="home-contact-art" aria-hidden="true"><SvGroupsWordmark className="sv-wordmark-hero"/></div>
    </section>

    <HomeCategoryCatalogue categories={categories} unavailable={catalogueUnavailable}/>

    <section className="hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-content"><div className="eyebrow"><Sparkles size={14} aria-hidden="true"/> THE DIWALI COLLECTION · EST. WITH CARE</div><h2>Make room<br/>for a little <em>magic.</em></h2><p>Thoughtfully chosen favourites for moments that bring everyone together. Explore, compare and plan your celebration.</p><div className="hero-actions"><Link href="/catalogue" className="button button-gold">Explore the catalogue <ArrowUpRight size={16}/></Link><Link href="/contact" className="button button-outline">Talk to our team</Link></div><div className="hero-note"><span className="gold-dot"/> A considered collection for a brighter celebration</div></div><div className="hero-art"><div className="art-frame"><div className="art-glow"/><div className="diya"><div className="flame"/><div className="wick"/><div className="bowl"><div className="oil"/></div><div className="dish"/></div><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-spark s1">✦</div><div className="art-spark s2">✧</div><div className="art-spark s3">✦</div><div className="art-caption">LIGHT · JOY · TOGETHERNESS</div></div></div><a href="#collection" className="scroll-cue">DISCOVER THE COLLECTION <ArrowDownRight size={17} aria-hidden="true"/></a></section>

    <section className="intro-band"><div><span>01 / OUR PROMISE</span><p>Celebration with <em>intention.</em></p></div><p>Beautifully curated festive favourites, easy-to-understand pricing and a team ready to help with general questions. Simple, thoughtful, and made for the moments you remember.</p><div className="intro-stat"><strong>{String(categories.length).padStart(2, "0")}</strong><span>Collections</span></div></section>

    <section className="cta-band"><div className="cta-flower" aria-hidden="true">✳</div><div><div className="eyebrow">WE’RE HERE TO HELP</div><h2>A question about<br/>the <em>collection?</em></h2></div><Link href="/contact" className="button button-gold">Get in touch <ArrowUpRight size={16} aria-hidden="true"/></Link></section>
    <section className="legal-home-section"><div className="legal-home-intro"><span className="eyebrow">CLEAR INFORMATION · RESPONSIBLE BROWSING</span><p>Important information about this catalogue.</p></div><LegalComplianceNotice/></section>
  </main>;
}
