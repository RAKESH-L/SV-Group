import type { ProductView } from "@/components/product-card";
import { discountPercent } from "@/lib/format";
import { isSelectableAvailability } from "@/lib/cart-calculations";

export type ProductFilterState = {
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  minDiscount: number;
  availableOnly: boolean;
  sort: "name" | "price-asc" | "price-desc" | "discount-desc";
};

export const DEFAULT_FILTERS: ProductFilterState = {
  query: "", category: "all", minPrice: "", maxPrice: "", minDiscount: 0, availableOnly: false, sort: "name",
};

export function filterProducts(products: ProductView[], filters: ProductFilterState): ProductView[] {
  const words = filters.query.trim().toLocaleLowerCase("en-IN").split(/\s+/).filter(Boolean);
  const minimum = filters.minPrice.trim() === "" ? null : Number(filters.minPrice);
  const maximum = filters.maxPrice.trim() === "" ? null : Number(filters.maxPrice);
  if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0))
    || (maximum !== null && (!Number.isFinite(maximum) || maximum < 0))) return [];

  return products.filter(product => {
    const searchText = [product.name, product.description, product.category.name].join(" ").toLocaleLowerCase("en-IN");
    if (words.some(word => !searchText.includes(word))) return false;
    if (filters.category !== "all" && product.category.slug !== filters.category) return false;
    if (minimum !== null && product.discountedPrice < minimum) return false;
    if (maximum !== null && product.discountedPrice > maximum) return false;
    if (discountPercent(product.originalPrice, product.discountedPrice) < filters.minDiscount) return false;
    if (filters.availableOnly && !isSelectableAvailability(product.availability)) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === "price-asc") return a.discountedPrice - b.discountedPrice || a.name.localeCompare(b.name);
    if (filters.sort === "price-desc") return b.discountedPrice - a.discountedPrice || a.name.localeCompare(b.name);
    if (filters.sort === "discount-desc") return discountPercent(b.originalPrice, b.discountedPrice) - discountPercent(a.originalPrice, a.discountedPrice) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}
