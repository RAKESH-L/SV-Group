"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { money } from "@/lib/format";
import { formatPaise } from "@/lib/cart-calculations";
import { useCart } from "@/components/cart-provider";
import { InformationRequestForm } from "@/components/information-request-form";
import { PersonalEstimateDownload } from "@/components/personal-estimate-download";
import { useState } from "react";

export function Cart() {
  const { lines, ready, totals, setQuantity, remove, clear } = useCart();
  const [requestOpen, setRequestOpen] = useState(false);
  if (!ready) return <main className="page-shell"><div className="eyebrow">YOUR PRICE CALCULATOR</div><h1 className="page-title">Your <em>selection</em></h1><p role="status" className="page-lede">Loading your saved selection…</p></main>;
  const savings = totals.originalPaise - totals.indicativePaise;
  return <main className="page-shell"><div className="eyebrow">YOUR PRICE CALCULATOR</div><h1 className="page-title">Your <em>selection</em></h1><p className="page-lede">Compare indicative prices and savings for your own planning.</p>
    {!lines.length ? <div className="empty-state"><div className="empty-icon">✦</div><h2>Your selection is empty</h2><p>Add products from the catalogue to compare prices.</p><Link className="button button-gold" href="/catalogue">Explore catalogue</Link></div> : <div className="cart-layout"><div className="cart-lines">
      {lines.map(({ product, quantity }) => <div key={product.id} className="cart-line"><div className="cart-product"><span className="cart-spark">✺</span><div><strong>{product.name}</strong><small>{money(product.discountedPrice)} each · {product.category.name}</small></div></div><div className="quantity"><button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}><Minus size={14}/></button><span aria-live="polite">{quantity}</span><button type="button" onClick={() => setQuantity(product, quantity + 1)} aria-label={`Increase ${product.name} quantity`}><Plus size={14}/></button></div><strong className="line-total">{formatPaise(Math.round(product.discountedPrice * 100) * quantity)}</strong><button type="button" className="icon-button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}><Trash2 size={17}/></button></div>)}
      <button className="text-button" onClick={clear}>Clear selection</button>
    </div><aside className="summary-card"><h2>Price summary</h2><div className="summary-row"><span>Distinct products</span><span>{lines.length}</span></div><div className="summary-row"><span>Total quantity</span><span>{totals.totalQuantity}</span></div><div className="summary-row"><span>Original subtotal</span><span>{formatPaise(totals.originalPaise)}</span></div><div className="summary-row"><span>Indicative subtotal</span><span>{formatPaise(totals.indicativePaise)}</span></div><div className="summary-row savings"><span>Total estimated savings</span><span>{formatPaise(savings)}</span></div><div className="summary-total"><span>Indicative final total</span><strong>{formatPaise(totals.indicativePaise)}</strong></div><p>Prices are indicative and may change. This calculator does not create an order, reservation or purchase request.</p><PersonalEstimateDownload lines={lines}/><button className="button button-gold information-request-trigger" onClick={() => setRequestOpen(true)}>Send Information Request</button></aside></div>}
    {requestOpen&&<InformationRequestForm topics={lines.map(({product})=>({id:product.id,name:product.name}))} onClose={()=>setRequestOpen(false)}/>}
  </main>;
}
