"use client";
import { useState } from "react";
import type { ProductView } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import { isSelectableAvailability } from "@/lib/cart-calculations";
export function AddToCart({ product }: { product: ProductView }) {
  const [added, setAdded] = useState(false);
  const { lines, ready, setQuantity } = useCart();
  const available = isSelectableAvailability(product.availability);
  function add() {
    const current = lines.find(line => line.product.id === product.id)?.quantity || 0;
    setQuantity(product, current + 1);
    setAdded(true); setTimeout(() => setAdded(false), 1800);
  }
  return <button className="button button-gold" disabled={!ready || !available} onClick={add}>{!available ? "Currently unavailable" : added ? "Added to calculator ✓" : "Add to price calculator ↗"}</button>;
}
