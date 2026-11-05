import Image from "next/image";
import { T } from "@/components/language-provider";
import { AvailabilityBadge } from "@/components/availability-badge";
import Link from "next/link";
import { discountPercent, money } from "@/lib/format";
import type { ReactNode } from "react";

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number;
  availability: string;
  category: { name: string; slug: string };
};

export function ProductCard({ product, compact = false, quantityControl }: { product: ProductView; compact?: boolean; quantityControl?: ReactNode }) {
  const off = discountPercent(product.originalPrice, product.discountedPrice);
  const href = `/catalogue/${product.slug}`;

  if (compact) {
    return <article className="product-card-compact">
      <Link className="product-card-compact-image" href={href} aria-label={`View ${product.name} details`}>
        {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:380px) 31vw, (max-width:760px) 44vw, (max-width:1050px) 17vw, 11vw"/> : <div className="image-placeholder"><span aria-hidden="true">✧</span><small>{product.category.name}</small></div>}
        <span className="discount-badge">{off}% <T text="OFF"/></span><AvailabilityBadge availability={product.availability} overlay/>
      </Link>
      <div className="product-card-compact-info">
        <div className="product-category">{product.category.name}</div>
        <h3><Link href={href}>{product.name}</Link></h3>
        {product.description && <p className="product-card-description">{product.description}</p>}
        <div className="price-line"><strong>{money(product.discountedPrice)}</strong><del>{money(product.originalPrice)}</del></div>
        <div className="availability"><AvailabilityBadge availability={product.availability}/></div>
        {quantityControl}
        <Link className="product-card-details" href={href}><T text="View Details"/> <span aria-hidden="true">↗</span></Link>
      </div>
    </article>;
  }

  return <Link className="product-card" href={href}>
    <div className="product-photo">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 25vw"/> : <div className="image-placeholder"><span aria-hidden="true">✧</span><small>{product.category.name}</small></div>}<span className="discount-badge">{off}% <T text="OFF"/></span><AvailabilityBadge availability={product.availability} overlay/></div>
    <div className="product-info"><div className="product-category">{product.category.name}</div><h3>{product.name}</h3><div className="price-line"><strong>{money(product.discountedPrice)}</strong><del>{money(product.originalPrice)}</del></div><div className="availability"><AvailabilityBadge availability={product.availability}/></div><div className="product-bottom"><span><T text="Save"/> {money(product.originalPrice - product.discountedPrice)}</span><b><T text="View details"/> ↗</b></div></div>
  </Link>;
}
