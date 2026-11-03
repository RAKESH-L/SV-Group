import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";

export type HomeProductCategory = { id: string; name: string; slug: string; products: ProductView[] };

export function HomeCategoryCatalogue({ categories, unavailable = false }: { categories: HomeProductCategory[]; unavailable?: boolean }) {
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
      <nav className="home-category-jumps" aria-label="Jump to a product category">
        {categories.map(category => <a key={category.id} href={`#home-category-${category.slug}`}>{category.name}</a>)}
      </nav>
      <div className="home-category-sections">
        {categories.map(category => <section key={category.id} id={`home-category-${category.slug}`} className="home-product-category" aria-labelledby={`home-heading-${category.slug}`}>
          <header className="home-product-category-heading">
            <h3 id={`home-heading-${category.slug}`}>{category.name}</h3>
            <span>{category.products.length} {category.products.length === 1 ? "product" : "products"}</span>
          </header>
          <div className="home-product-grid">
            {category.products.map(product => <ProductCard key={product.id} product={product} compact/>)}
          </div>
        </section>)}
      </div>
    </> : <div className="home-category-empty" role="status">
      <h3>{unavailable ? "The collection is temporarily unavailable." : "The collection is being prepared."}</h3>
      <p>{unavailable ? "Please try again in a little while." : "There are no active products to display right now. Please check back soon."}</p>
      <Link className="button button-outline" href="/catalogue">View catalogue</Link>
    </div>}
  </section>;
}
