import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ProductCard, type ProductView } from "@/components/product-card";
import { db } from "@/lib/db";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";

export const metadata: Metadata = {
  title: "Categories | Sri Vinayaka Groups",
  description: "Explore the Sri Vinayaka Groups festive collection, organised by category.",
  alternates: { canonical: "/categories" },
};

export const dynamic = "force-dynamic";

type CategoryProducts = { id: string; name: string; slug: string; products: ProductView[] };

export default async function CategoriesPage() {
  let categories: CategoryProducts[] = [];
  let databaseAvailable = true;

  try {
    const rows = await db.category.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          where: { active: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          include: { category: { select: { name: true, slug: true } } },
        },
      },
    });

    categories = rows
      .filter(category => category.products.length > 0)
      .map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        products: category.products.map((product: Prisma.ProductGetPayload<{ include: { category: { select: { name: true; slug: true } } } }>) => ({
          ...product,
          originalPrice: Number(product.originalPrice),
          discountedPrice: Number(product.discountedPrice),
        })),
      }));
  } catch {
    databaseAvailable = false;
  }

  return <main className="page-shell categories-page">
    <div className="eyebrow">THE SV GROUPS COLLECTION</div>
    <h1 className="page-title">Explore by <em>category.</em></h1>
    <p className="page-lede">Browse our current collection, thoughtfully grouped to help you find the right favourites for your celebration.</p>

    {categories.length > 0 && <nav className="category-jump-nav" aria-label="Browse product categories">
      <a className="category-jump-all" href="#all-categories">All Categories <ArrowDown size={13} aria-hidden="true"/></a>
      {categories.map(category => <a key={category.id} href={`#category-${category.slug}`}>{category.name}</a>)}
    </nav>}

    {categories.length > 0 ? <div id="all-categories" className="category-sections">
      {categories.map(category => <section key={category.id} id={`category-${category.slug}`} className="category-section" aria-labelledby={`heading-${category.slug}`}>
        <div className="category-section-heading">
          <div><div className="eyebrow">{String(category.products.length).padStart(2, "0")} {category.products.length === 1 ? "ITEM" : "ITEMS"}</div><h2 id={`heading-${category.slug}`}>{category.name}</h2></div>
          <Link href={`/catalogue?category=${encodeURIComponent(category.slug)}`} aria-label={`View ${category.name} in the full catalogue`}>Browse catalogue <ArrowUpRight size={15} aria-hidden="true"/></Link>
        </div>
        <div className="product-grid">{category.products.map(product => <ProductCard key={product.id} product={product}/>)}</div>
      </section>)}
    </div> : <div className="categories-empty-state" role="status">
      <span aria-hidden="true">✧</span>
      <h2>{databaseAvailable ? "Our categories are taking shape." : "The collection is temporarily unavailable."}</h2>
      <p>{databaseAvailable ? "There are no active products to display just yet. Please check back soon." : "Please try again in a little while."}</p>
      {databaseAvailable && <Link className="button button-outline" href="/catalogue">View the catalogue</Link>}
    </div>}
    <LegalComplianceNotice variant="compact"/>
  </main>;
}
