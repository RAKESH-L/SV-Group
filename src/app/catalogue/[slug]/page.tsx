import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, discountPercent } from "@/lib/format";
import { AddToCart } from "@/components/add-to-cart";
import { AvailabilityBadge } from "@/components/availability-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { business } from "@/lib/business";
import { T } from "@/components/language-provider";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findFirst({ where: { slug, active: true } });
  return { title: p ? `${p.name} | SV Groups` : "Product | SV Groups" };
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await db.product.findFirst({ where: { slug, active: true }, include: { category: true } }).catch(() => null);
  if (!p) notFound();
  const original = Number(p.originalPrice), discounted = Number(p.discountedPrice);
  return <main className="page-shell"><Link className="back-link" href="/catalogue"><T text="← Back to catalogue"/></Link><div className="detail-layout"><div className="detail-image">{p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width:800px) 90vw, 50vw" priority/> : <div className="image-placeholder detail-placeholder"><span>✦</span><small>{p.category.name}</small></div>}<span className="discount-badge">{discountPercent(original,discounted)}% <T text="OFF"/></span><AvailabilityBadge availability={p.availability} overlay/></div><div className="detail-copy"><div className="eyebrow">{p.category.name.toUpperCase()}</div><h1>{p.name}</h1><p>{p.description}</p><div className="detail-prices"><strong>{money(discounted)}</strong><del>{money(original)}</del><span><T text="Save"/> {money(original-discounted)}</span></div><div className="availability"><AvailabilityBadge availability={p.availability}/></div><div className="detail-favorites-row"><FavoriteButton id={p.id}/><span><T text="Save to Favorites" /></span></div><AddToCart product={{...p, originalPrice: original, discountedPrice: discounted}}/><a className="button button-outline sv-product-whatsapp" href={"https://wa.me/919986885682?text=" + encodeURIComponent("Sri Vinayaka Groups — Product information\\n\\nPlease tell me more about " + p.name + ". I would like current availability and general product details, not an order, booking or reservation.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true"/> <T text="Ask on WhatsApp"/></a><p className="detail-note"><T text="This only adds the product to a price calculator stored on this device. It does not create an order or reservation."/></p><Link className="underlined-link" href="/catalogue"><T text="Continue browsing ↗"/></Link></div></div><div className="catalogue-contact detail-contact"><div><span className="eyebrow"><T text="QUESTIONS? WE’RE LOCAL"/></span><strong><T text="Ask our team in"/> {business.locality}</strong><span>{business.phone}</span></div><a href={business.phoneHref}><T text="Call now"/> <ArrowUpRight size={15}/></a></div></main>;
}
