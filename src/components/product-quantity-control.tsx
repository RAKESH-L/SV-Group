"use client";
import { useEffect } from "react";
import { useLanguage } from "@/components/language-provider";
import { Minus, Plus } from "lucide-react";
import type { ProductView } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import { isSelectableAvailability, MAX_CALCULATOR_QUANTITY } from "@/lib/cart-calculations";

export function ProductQuantityControl({ product }: { product: ProductView }) {
  const { lines, ready, setQuantity } = useCart();
  const { t } = useLanguage();
  const line = lines.find(item => item.product.id === product.id);
  const quantity = ready ? line?.quantity || 0 : 0;
  const available = isSelectableAvailability(product.availability);
  useEffect(() => { if (ready && !available && quantity > 0) setQuantity(product, 0); }, [ready, available, quantity, product, setQuantity]);
  return <div className="home-quantity-control" aria-label={`Calculator quantity for ${product.name}`}>
    <span className="home-quantity-label">{t("Quantity")}</span>
    <div className="home-quantity-stepper">
      <button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={!ready || !available || quantity === 0} onClick={() => setQuantity(product, quantity - 1)}><Minus size={14}/></button>
      <output aria-live="polite" aria-label={`${quantity} selected`}>{quantity}</output>
      <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={!ready || !available || quantity >= MAX_CALCULATOR_QUANTITY} onClick={() => setQuantity(product, quantity + 1)}><Plus size={14}/></button>
    </div>
    {!available && <span className="home-quantity-unavailable">{t("Unavailable")}</span>}
  </div>;
}
