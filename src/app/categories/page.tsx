import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CategoriesBrowser, type CategoryProducts } from "@/components/categories-browser";
import { db } from "@/lib/db";
import { T } from "@/components/language-provider";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";

export const metadata: Metadata = {
  title: "Categories | Sri Vinayaka Groups",
  description: "Explore the Sri Vinayaka Groups festive collection, organised by category.",
  alternates: { canonical: "/categories" },
};

export const dynamic = "force-dynamic";

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
    <div className="eyebrow"><T text="THE SV GROUPS COLLECTION"/></div>
    <h1 className="page-title"><T text="Explore by"/> <em><T text="category."/></em></h1>
    <p className="page-lede"><T text="Browse our current collection, thoughtfully grouped to help you find the right favourites for your celebration."/></p>

    {categories.length > 0 ? <CategoriesBrowser categories={categories}/> : <div className="categories-empty-state" role="status">
      <span aria-hidden="true">✧</span>
      <h2>{databaseAvailable ? <T text="Our categories are taking shape."/> : <T text="The collection is temporarily unavailable."/>}</h2>
      <p>{databaseAvailable ? <T text="There are no active products to display just yet. Please check back soon."/> : <T text="Please try again in a little while."/>}</p>
      {databaseAvailable && <Link className="button button-outline" href="/catalogue"><T text="View catalogue"/></Link>}
    </div>}
    <LegalComplianceNotice variant="compact"/>
  </main>;
}
