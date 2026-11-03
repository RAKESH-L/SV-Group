import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ProductCard, type ProductView } from "@/components/product-card";
import { business } from "@/lib/business";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: ProductView[] = [], categories = 0;
  try {
    const [p, c] = await Promise.all([
      db.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { createdAt: "desc" }, take: 4 }),
      db.category.count(),
    ]);
    products = p.map((x: Prisma.ProductGetPayload<{ include: { category: true } }>) => ({ ...x, originalPrice: Number(x.originalPrice), discountedPrice: Number(x.discountedPrice) }));
    categories = c;
  } catch { /* show an empty catalogue until database is connected */ }

  return <main>
    <section className="home-contact">
      <div className="home-contact-copy">
        <div className="eyebrow"><Sparkles size={14}/> HERE FOR YOUR CELEBRATION</div>
        <h1>{business.name}</h1>
        <p>Thoughtful festive favourites and friendly help for your celebration, from Tumkur.</p>
        <div className="home-contact-actions">
          <a className="contact-action" href={business.phoneHref}><span className="contact-action-icon"><Phone size={17}/></span><span><small>CALL NOW</small><strong>{business.phone}</strong></span><ArrowUpRight size={16}/></a>
          <a className="contact-action" href={business.emailHref}><span className="contact-action-icon"><Mail size={17}/></span><span><small>EMAIL US</small><strong>{business.email}</strong></span><ArrowUpRight size={16}/></a>
          <div className="home-location"><MapPin size={16}/><span><small>BASED IN</small><strong>{business.address}</strong></span></div>
        </div>
      </div>
      <div className="home-contact-art"><Image className="home-full-logo" src="/branding/sv-logo-full.webp" alt="" width={640} height={224} priority/></div>
    </section>
    <section className="hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-content"><div className="eyebrow"><Sparkles size={14}/> THE DIWALI COLLECTION · EST. WITH CARE</div><h2>Make room<br/>for a little <em>magic.</em></h2><p>Thoughtfully chosen favourites for moments that bring everyone together. Explore, compare and plan your celebration.</p><div className="hero-actions"><Link href="/catalogue" className="button button-gold">Explore the catalogue <ArrowUpRight size={16}/></Link><Link href="/contact" className="button button-outline">Talk to our team</Link></div><div className="hero-note"><span className="gold-dot"/> A considered collection for a brighter celebration</div></div><div className="hero-art"><div className="art-frame"><div className="art-glow"/><div className="diya"><div className="flame"/><div className="wick"/><div className="bowl"><div className="oil"/></div><div className="dish"/></div><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-spark s1">✦</div><div className="art-spark s2">✧</div><div className="art-spark s3">✦</div><div className="art-caption">LIGHT · JOY · TOGETHERNESS</div></div></div><a href="#collection" className="scroll-cue">DISCOVER THE COLLECTION <ArrowDownRight size={17}/></a></section>
    <section className="intro-band"><div><span>01 / OUR PROMISE</span><p>Celebration with <em>intention.</em></p></div><p>Beautifully curated festive favourites, easy-to-understand pricing and a team ready to help with general questions. Simple, thoughtful, and made for the moments you remember.</p><div className="intro-stat"><strong>{String(categories).padStart(2,"0")}</strong><span>Collections</span></div></section>
    <section className="featured section-wrap" id="collection"><div className="section-heading"><div><div className="eyebrow">A FEW FAVOURITES</div><h2>Made for the <em>moment.</em></h2></div><Link className="underlined-link" href="/catalogue">View full catalogue <ArrowUpRight size={15}/></Link></div>{products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p}/>)}</div> : <div className="catalogue-placeholder"><div>✦</div><span>Our collection is getting ready.</span><small>Check back soon for the latest catalogue.</small></div>}</section>
    <section className="cta-band"><div className="cta-flower">✳</div><div><div className="eyebrow">WE’RE HERE TO HELP</div><h2>A question about<br/>the <em>collection?</em></h2></div><Link href="/contact" className="button button-gold">Get in touch <ArrowUpRight size={16}/></Link></section>
    <section className="legal-home-section"><div className="legal-home-intro"><span className="eyebrow">CLEAR INFORMATION · RESPONSIBLE BROWSING</span><p>Important information about this catalogue.</p></div><LegalComplianceNotice/></section>
  </main>;
}
