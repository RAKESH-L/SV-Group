import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, discountPercent } from "@/lib/format";
import { AddToCart } from "@/components/add-to-cart";
import { business } from "@/lib/business";

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
  return <main className="page-shell"><Link className="back-link" href="/catalogue">← Back to catalogue</Link><div className="detail-layout"><div className="detail-image">{p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width:800px) 90vw, 50vw" priority/> : <div className="image-placeholder detail-placeholder"><span>✦</span><small>{p.category.name}</small></div>}<span className="discount-badge">{discountPercent(original,discounted)}% OFF</span></div><div className="detail-copy"><div className="eyebrow">{p.category.name.toUpperCase()}</div><h1>{p.name}</h1><p>{p.description}</p><div className="detail-prices"><strong>{money(discounted)}</strong><del>{money(original)}</del><span>Save {money(original-discounted)}</span></div><div className="availability"><i/> {p.availability}</div><AddToCart product={{...p, originalPrice: original, discountedPrice: discounted}}/><p className="detail-note">This only adds the product to a price calculator stored on this device. It does not create an order or reservation.</p><Link className="underlined-link" href="/catalogue">Continue browsing ↗</Link></div></div><div className="catalogue-contact detail-contact"><div><span className="eyebrow">QUESTIONS? WE’RE LOCAL</span><strong>Ask our team in {business.locality}</strong><span>{business.phone}</span></div><a href={business.phoneHref}>Call now <ArrowUpRight size={15}/></a></div></main>;
}
