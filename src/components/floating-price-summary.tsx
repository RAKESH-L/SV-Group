"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatPaise } from "@/lib/cart-calculations";

export function FloatingPriceSummary() {
  const { lines, ready, totals } = useCart();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { const active = ready && lines.length > 0; document.body.classList.toggle("has-floating-price-summary", active); return () => document.body.classList.remove("has-floating-price-summary"); }, [ready, lines.length]);
  if (!ready || lines.length === 0) return null;
  const savings = totals.originalPaise - totals.indicativePaise;
  return <aside className={`floating-price-summary${expanded ? " expanded" : ""}`} aria-label="Your indicative calculator summary">
    <div className="floating-price-main">
      <div className="floating-price-count"><strong>{lines.length}</strong><span>{lines.length === 1 ? "product" : "products"}</span><small>{totals.totalQuantity} total qty</small></div>
      <div className="floating-price-values">
        <div><span>Original</span><strong>{formatPaise(totals.originalPaise)}</strong></div>
        <div><span>Indicative subtotal</span><strong className="floating-price-gold">{formatPaise(totals.indicativePaise)}</strong></div>
        <div className="floating-price-savings"><span>Estimated savings</span><strong>{formatPaise(savings)}</strong></div>
      </div>
      <button type="button" className="floating-price-expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><span aria-hidden="true">{expanded ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}</span><span className="visually-hidden">{expanded ? "Hide" : "Show"} detailed estimate</span></button>
      <Link className="button button-gold floating-price-action" href="/cart">View Price Calculator <span aria-hidden="true">↗</span></Link>
    </div>
    {expanded && <div className="floating-price-mobile-details"><div><span>Distinct products</span><strong>{lines.length}</strong></div><div><span>Total quantity</span><strong>{totals.totalQuantity}</strong></div><div><span>Original subtotal</span><strong>{formatPaise(totals.originalPaise)}</strong></div><div><span>Indicative subtotal / estimated final total</span><strong>{formatPaise(totals.indicativePaise)}</strong></div><div><span>Estimated savings</span><strong>{formatPaise(savings)}</strong></div></div>}
  </aside>;
}
