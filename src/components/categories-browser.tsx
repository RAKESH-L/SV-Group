"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, RotateCcw, Search } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";
import { DEFAULT_FILTERS, filterProducts } from "@/lib/catalogue-filters";

export type CategoryProducts = { id: string; name: string; slug: string; products: ProductView[] };

export function CategoriesBrowser({ categories }: { categories: CategoryProducts[] }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("all");
  const filtered = useMemo(() => categories
    .filter(category => selected === "all" || selected === category.slug)
    .map(category => ({ ...category, products: filterProducts(category.products, { ...DEFAULT_FILTERS, query }) }))
    .filter(category => category.products.length > 0), [categories, query, selected]);
  const total = categories.reduce((sum, group) => sum + group.products.length, 0);
  const count = filtered.reduce((sum, group) => sum + group.products.length, 0);

  function reset() { setQuery(""); setSelected("all"); }

  return <div className="categories-browser">
    <div className="categories-search-area" aria-label="Search within product categories">
      <label className="search-main-field" htmlFor="categories-product-search">
        <Search size={18} aria-hidden="true"/>
        <input id="categories-product-search" type="search" maxLength={100} value={query} autoComplete="off"
          onChange={event => setQuery(event.target.value)} placeholder={t("Search items within categories…")}/>
      </label>
      <label className="home-search-category">
        <span>{t("Category")}</span>
        <select value={selected} onChange={event => setSelected(event.target.value)}>
          <option value="all">{t("All categories")}</option>
          {categories.map(group => <option value={group.slug} key={group.id}>{group.name}</option>)}
        </select>
      </label>
    </div>
    <div className="search-results-toolbar" aria-live="polite" role="status">
      <span><strong>{count}</strong> / {total} {t("products")} · {filtered.length} {t(filtered.length === 1 ? "category" : "categories")}</span>
      {(query || selected !== "all") && <button type="button" className="search-reset" onClick={reset}><RotateCcw size={13} aria-hidden="true"/> {t("Clear filters")}</button>}
    </div>
    {filtered.length > 0 ? <>
      <nav className="category-jump-nav" aria-label="Browse matching product categories">
        <a className="category-jump-all" href="#all-categories">{t("All matching categories")} <ArrowDown size={13} aria-hidden="true"/></a>
        {filtered.map(group => <a key={group.id} href={`#category-${group.slug}`}>{group.name}</a>)}
      </nav>
      <div id="all-categories" className="category-sections">
        {filtered.map(group => <section key={group.id} id={`category-${group.slug}`} className="category-section" aria-labelledby={`heading-${group.slug}`}>
          <div className="category-section-heading">
            <div><div className="eyebrow">{String(group.products.length).padStart(2, "0")} {t(group.products.length === 1 ? "ITEM" : "ITEMS")}</div><h2 id={`heading-${group.slug}`}>{group.name}</h2></div>
            <Link href={`/catalogue?category=${encodeURIComponent(group.slug)}`} aria-label={`View ${group.name} in the full catalogue`}>{t("Browse catalogue")} <ArrowUpRight size={15} aria-hidden="true"/></Link>
          </div>
          <div className="product-grid">{group.products.map(product => <ProductCard key={product.id} product={product}/>)}</div>
        </section>)}
      </div>
    </> : <div className="search-no-results" role="status">
      <Search size={28} aria-hidden="true"/>
      <h2>{t("No matching products found")}</h2>
      <p>{t("Try another product name or select a different category.")}</p>
      <button type="button" className="button button-outline" onClick={reset}>{t("Browse all categories")}</button>
    </div>}
  </div>;
}
