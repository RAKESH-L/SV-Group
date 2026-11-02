import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { CatalogueClient } from "@/components/catalogue-client";
import type { ProductView } from "@/components/product-card";
import type { Prisma } from "@prisma/client";
import { business } from "@/lib/business";

export const metadata: Metadata = { title: "Catalogue | SV Groups" };
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  let products: ProductView[] = [], categories: { name: string; slug: string }[] = [];
  try {
    const [p, c] = await Promise.all([
      db.product.findMany({ where: { active: true }, include: { category: true }, orderBy: { name: "asc" } }),
      db.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    ]);
    products = p.map((x: Prisma.ProductGetPayload<{ include: { category: true } }>) => ({ ...x, originalPrice: Number(x.originalPrice), discountedPrice: Number(x.discountedPrice) }));
    categories = c;
  } catch { /* DB may not be configured in development */ }
  return <main className="page-shell"><div className="eyebrow">THE SV GROUPS SELECTION</div><h1 className="page-title">A little <em>something</em><br/>for every celebration.</h1><p className="page-lede">Explore the collection and compare indicative prices. Find just the right thing for your festive moments.</p><CatalogueClient products={products} categories={categories}/><div className="catalogue-notice">This is an informational catalogue with an at-home price calculator. It does not support orders or reservations.</div><div className="catalogue-contact"><div><span className="eyebrow">HERE TO HELP</span><strong>Questions about the collection?</strong><span>Call {business.phone} in {business.locality}</span></div><Link href="/contact">Get in touch <ArrowUpRight size={15}/></Link></div></main>;
}
