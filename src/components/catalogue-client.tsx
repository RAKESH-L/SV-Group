"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, ArrowUpDown } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";
import { DEFAULT_FILTERS, filterProducts, type ProductFilterState } from "@/lib/catalogue-filters";

type Props = {
  products: ProductView[];
  categories: { name: string; slug: string }[];
  initialCategory?: string;
  initialQuery?: string;
};

export function CatalogueClient({ products, categories, initialCategory = "all", initialQuery = "" }: Props) {
  const [filters, setFilters] = useState<ProductFilterState>({
    ...DEFAULT_FILTERS,
    category: categories.some(item => item.slug === initialCategory) ? initialCategory : "all",
    query: initialQuery.slice(0, 100),
  });
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(() => filterProducts(products, filters), [products, filters]);
  const hasFilters = filters.query.trim() !== "" || filters.category !== "all"
    || filters.minPrice !== "" || filters.maxPrice !== "" || filters.minDiscount !== 0
    || filters.availableOnly || filters.sort !== "name";

  function update<K extends keyof ProductFilterState>(key: K, value: ProductFilterState[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
  }

  function reset() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  return <section className="search-catalogue" aria-label="Find and filter products">
    <div className="search-catalogue-top">
      <label className="search-main-field" htmlFor="catalogue-search">
        <Search size={19} aria-hidden="true"/>
        <input id="catalogue-search" type="search" value={filters.query} maxLength={100} autoComplete="off"
          onChange={event => update("query", event.target.value)} placeholder="Search crackers, categories, product names…"/>
      </label>
      <label className="search-control-select search-category-select">
        <span>Category</span>
        <select value={filters.category} onChange={event => update("category", event.target.value)} aria-label="Filter category">
          <option value="all">All categories</option>
          {categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <button className={`search-filter-toggle ${expanded ? "active" : ""}`} type="button"
        aria-expanded={expanded} aria-controls="catalogue-extra-filters" onClick={() => setExpanded(previous => !previous)}>
        <SlidersHorizontal size={17} aria-hidden="true"/> More filters
      </button>
    </div>
    <div id="catalogue-extra-filters" className="search-extra-filters" hidden={!expanded}>
      <div className="search-extra-grid">
        <label className="search-price-input">
          Minimum price (₹)
          <input type="number" inputMode="decimal" min="0" step="1" placeholder="₹ Min" value={filters.minPrice}
            onChange={event => update("minPrice", event.target.value)}/>
        </label>
        <label className="search-price-input">
          Maximum price (₹)
          <input type="number" inputMode="decimal" min="0" step="1" placeholder="₹ Max" value={filters.maxPrice}
            onChange={event => update("maxPrice", event.target.value)}/>
        </label>
        <label className="search-control-select">
          Discount
          <select aria-label="Minimum discount" value={filters.minDiscount} onChange={event => update("minDiscount", Number(event.target.value))}>
            <option value={0}>Any discount</option>
            {[10, 25, 50, 75, 90].map(percent => <option value={percent} key={percent}>{percent}% off or more</option>)}
          </select>
        </label>
        <label className="search-control-select">
          <span><ArrowUpDown size={13} aria-hidden="true"/> Sort</span>
          <select value={filters.sort} onChange={event => update("sort", event.target.value as ProductFilterState["sort"])} aria-label="Sort products">
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="discount-desc">Highest discount</option>
          </select>
        </label>
      </div>
      <label className="search-availability"><input type="checkbox" checked={filters.availableOnly}
        onChange={event => update("availableOnly", event.target.checked)}/> In-stock products only</label>
    </div>
    <div className="search-results-toolbar" role="status" aria-live="polite">
      <span><strong>{visible.length}</strong> of {products.length} {products.length === 1 ? "product" : "products"} shown</span>
      {hasFilters && <button type="button" onClick={reset} className="search-reset"><RotateCcw size={13} aria-hidden="true"/> Clear all filters</button>}
    </div>
    {products.length > 0 && visible.length > 0 && <div className="product-grid">{visible.map(product => <ProductCard key={product.id} product={product}/>)}</div>}
    {products.length > 0 && visible.length === 0 && <div className="search-no-results" role="status">
      <Search size={28} aria-hidden="true"/>
      <h2>No matching products found</h2>
      <p>Try a different name, category, price range or discount.</p>
      <button type="button" className="button button-outline" onClick={reset}>Show all products</button>
    </div>}
    {products.length === 0 && <div className="empty-state">No active products are available right now. Please check back later.</div>}
  </section>;
}
