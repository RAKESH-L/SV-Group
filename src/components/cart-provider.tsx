"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ProductView } from "@/components/product-card";
import { MAX_CALCULATOR_QUANTITY, calculateCartTotals, type CartLine } from "@/lib/cart-calculations";

const STORAGE_KEY = "sv-cart-v1";
type CartContextValue = { lines: CartLine[]; ready: boolean; totals: ReturnType<typeof calculateCartTotals>; setQuantity: (product: ProductView, quantity: number) => void; remove: (productId: string) => void; clear: () => void; replace: (lines: CartLine[]) => void };
const CartContext = createContext<CartContextValue | null>(null);

function validProduct(value: unknown): value is ProductView {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<ProductView>;
  return typeof product.id === "string" && typeof product.name === "string" && typeof product.slug === "string" && typeof product.description === "string" && (typeof product.imageUrl === "string" || product.imageUrl === null) && Number.isFinite(product.originalPrice) && Number.isFinite(product.discountedPrice) && typeof product.availability === "string" && !!product.category && typeof product.category.name === "string" && typeof product.category.slug === "string";
}

function readSavedLines(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, CartLine>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as { product?: unknown; quantity?: unknown };
      const quantity = Number(candidate.quantity);
      if (!validProduct(candidate.product) || !Number.isInteger(quantity) || quantity < 1) continue;
      const existing = unique.get(candidate.product.id);
      unique.set(candidate.product.id, { product: candidate.product, quantity: Math.min(MAX_CALCULATOR_QUANTITY, (existing?.quantity || 0) + quantity) });
    }
    return [...unique.values()];
  } catch { return []; }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => setLines(readSavedLines());
    load(); setReady(true);
    window.addEventListener("storage", load);
    window.addEventListener("sv-cart-updated", load);
    return () => { window.removeEventListener("storage", load); window.removeEventListener("sv-cart-updated", load); };
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* Keep the in-memory estimate usable when browser storage is full or disabled. */ } } }, [lines, ready]);
  const setQuantity = useCallback((product: ProductView, quantity: number) => {
    const nextQuantity = Math.max(0, Math.min(MAX_CALCULATOR_QUANTITY, Math.trunc(quantity)));
    setLines(previous => {
      const found = previous.some(line => line.product.id === product.id);
      if (nextQuantity === 0) return previous.filter(line => line.product.id !== product.id);
      if (found) return previous.map(line => line.product.id === product.id ? { product, quantity: nextQuantity } : line);
      return [...previous, { product, quantity: nextQuantity }];
    });
  }, []);
  const remove = useCallback((productId: string) => setLines(previous => previous.filter(line => line.product.id !== productId)), []);
  const clear = useCallback(() => setLines([]), []);
  const replace = useCallback((incoming: CartLine[]) => {
    const unique = new Map<string, CartLine>();
    for (const line of incoming.slice(0, 50)) {
      if (validProduct(line.product) && Number.isInteger(line.quantity) && line.quantity > 0) {
        unique.set(line.product.id, { product: line.product, quantity: Math.min(MAX_CALCULATOR_QUANTITY, line.quantity) });
      }
    }
    setLines([...unique.values()]);
  }, []);
  const totals = useMemo(() => calculateCartTotals(lines), [lines]);
  const value = useMemo(() => ({ lines, ready, totals, setQuantity, remove, clear, replace }), [lines, ready, totals, setQuantity, remove, clear, replace]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}
