"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, RotateCcw } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";
import { ProductQuantityControl } from "@/components/product-quantity-control";
import { FloatingPriceSummary } from "@/components/floating-price-summary";
import { DEFAULT_FILTERS, filterProducts } from "@/lib/catalogue-filters";

export type HomeProductCategory = { id: string; name: string; slug: string; products: ProductView[] };

export function HomeCategoryCatalogue({ categories, unavailable = false }: { categories: HomeProductCategory[]; unavailable?: boolean }) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState("all");
  const total = useMemo(() => categories.reduce((sum, category) => sum + category.products.length, 0), [categories]);
  const groups = useMemo(() => categories
    .filter(category => categorySlug === "all" || category.slug === categorySlug)
    .map(category => ({
      ...category,
      products: filterProducts(category.products, { ...DEFAULT_FILTERS, query }),
    }))
    .filter(category => category.products.length > 0), [categories, categorySlug, query]);
  const found = groups.reduce((sum, category) => sum + category.products.length, 0);

  function clear() {
    setQuery(""); setCategorySlug("all");
  }

  return <section id="collection" className="home-category-catalogue" aria-labelledby="home-category-title">
    <div className="home-category-heading">
      <div>
        <div className="eyebrow">THE COMPLETE SV GROUPS SELECTION</div>
        <h2 id="home-category-title">Explore every <em>category.</em></h2>
        <p>Browse the current collection by category and view indicative product information.</p>
      </div>
      <Link className="home-category-catalogue-link" href="/catalogue">Open full catalogue <ArrowUpRight size={15} aria-hidden="true"/></Link>
    </div>

    {categories.length > 0 ? <>
      <div className="home-search-area" aria-label="Find products on the homepage">
        <label className="search-main-field" htmlFor="home-product-search">
          <Search size={19} aria-hidden="true"/>
          <input id="home-product-search" type="search" value={query} maxLength={100}
            onChange={event => setQuery(event.target.value)} placeholder="Search products and categories…" autoComplete="off"/>
        </label>
        <label className="home-search-category">
          <span>Browse category</span>
          <select value={categorySlug} onChange={event => setCategorySlug(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map(category => <option value={category.slug} key={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>
      <div className="search-results-toolbar" role="status" aria-live="polite">
        <span><strong>{found}</strong> of {total} products shown across {groups.length} {groups.length === 1 ? "category" : "categories"}</span>
        {(query || categorySlug !== "all") && <button type="button" className="search-reset" onClick={clear}><RotateCcw size={13} aria-hidden="true"/> Clear search</button>}
      </div>
      {groups.length > 0 ? <>
        <nav className="home-category-jumps" aria-label="Jump to a product category">
          {groups.map(category => <a key={category.id} href={`#home-category-${category.slug}`}>{category.name}</a>)}
        </nav>
        <div className="home-category-sections">
          {groups.map(category => <section key={category.id} id={`home-category-${category.slug}`} className="home-product-category" aria-labelledby={`home-heading-${category.slug}`}>
            <header className="home-product-category-heading">
              <h3 id={`home-heading-${category.slug}`}>{category.name}</h3>
              <span>{category.products.length} {category.products.length === 1 ? "product" : "products"}</span>
            </header>
            <div className="home-product-grid">
              {category.products.map(product => <ProductCard key={product.id} product={product} compact quantityControl={<ProductQuantityControl product={product}/>}/>)}
            </div>
          </section>)}
        </div>
      </> : <div className="search-no-results" role="status">
        <Search size={28} aria-hidden="true"/>
        <h3>No products match your search.</h3>
        <p>Try a different product name or category.</p>
        <button type="button" className="button button-outline" onClick={clear}>Show all products</button>
      </div>}
      <FloatingPriceSummary/>
    </> : <div className="home-category-empty" role="status">
      <h3>{unavailable ? "The collection is temporarily unavailable." : "The collection is being prepared."}</h3>
      <p>{unavailable ? "Please try again in a little while." : "There are no active products to display right now. Please check back soon."}</p>
      <Link className="button button-outline" href="/catalogue">View catalogue</Link>
    </div>}
  </section>;
}
