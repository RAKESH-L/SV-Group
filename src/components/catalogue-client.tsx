"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProductView } from "@/components/product-card";
import { ProductCard } from "@/components/product-card";
export function CatalogueClient({ products, categories }: { products: ProductView[]; categories: { name: string; slug: string }[] }) {
 const [query, setQuery] = useState(""); const [category, setCategory] = useState("all");
 const visible = useMemo(() => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && (category === "all" || p.category.slug === category)), [products, query, category]);
 return <><div className="catalogue-tools"><label className="search-field"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find your favourites…" aria-label="Search products"/></label><select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category"><option value="all">All collections</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div><div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p}/>)}</div>{!visible.length && <div className="empty-state">No products match that search. Try another name or collection.</div>}</>;
}
