"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { calculateEffectiveDiscountPercent, calculateLineAmounts, formatPaiseExact } from "@/lib/cart-calculations";
import { useCart } from "@/components/cart-provider";
import { InformationRequestForm } from "@/components/information-request-form";
import { PersonalEstimateDownload } from "@/components/personal-estimate-download";
import { useState } from "react";

export function Cart() {
  const { lines, ready, totals, setQuantity, remove, clear } = useCart();
  const [requestOpen, setRequestOpen] = useState(false);
  if (!ready) return <main className="page-shell"><div className="eyebrow">YOUR PRICE CALCULATOR</div><h1 className="page-title">Your <em>selection</em></h1><p role="status" className="page-lede">Loading your saved selection…</p></main>;
  const savings = totals.originalPaise - totals.indicativePaise;
  const effectiveDiscount = calculateEffectiveDiscountPercent(totals.originalPaise, savings);
  return <main className="page-shell"><div className="eyebrow">YOUR PRICE CALCULATOR</div><h1 className="page-title">Your <em>selection</em></h1><p className="page-lede">Compare indicative prices and savings for your own planning.</p>
    {!lines.length ? <div className="empty-state"><div className="empty-icon">✦</div><h2>Your selection is empty</h2><p>Add products from the catalogue to compare prices.</p><Link className="button button-gold" href="/catalogue">Explore catalogue</Link></div> : <div className="cart-layout"><div className="cart-lines">
      {lines.map(line => {
        const { product, quantity } = line;
        const amount = calculateLineAmounts(line);
        return <article key={product.id} className="cart-line-card">
          <div className="cart-line">
            <div className="cart-product"><span className="cart-spark" aria-hidden="true">✦</span><div><strong>{product.name}</strong><small>{product.category.name}</small></div></div>
            <div className="quantity" aria-label={`Quantity for ${product.name}`}><button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}><Minus size={14}/></button><span aria-live="polite">{quantity}</span><button type="button" onClick={() => setQuantity(product, quantity + 1)} aria-label={`Increase ${product.name} quantity`}><Plus size={14}/></button></div>
            <strong className="line-total">{formatPaiseExact(amount.indicativeLinePaise)}</strong>
            <button type="button" className="icon-button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}><Trash2 size={17}/></button>
          </div>
          <dl className="cart-line-pricing">
            <div><dt>Quantity</dt><dd>{amount.quantity}</dd></div>
            <div><dt>Original unit</dt><dd>{formatPaiseExact(amount.originalUnitPaise)}</dd></div>
            <div><dt>Discount</dt><dd>{amount.discountPercent.toFixed(2)}%</dd></div>
            <div><dt>Indicative unit</dt><dd>{formatPaiseExact(amount.indicativeUnitPaise)}</dd></div>
            <div><dt>Original total</dt><dd>{formatPaiseExact(amount.originalLinePaise)}</dd></div>
            <div><dt>Estimated savings</dt><dd>{formatPaiseExact(amount.savingsPaise)}</dd></div>
            <div className="cart-line-indicative"><dt>Indicative total</dt><dd>{formatPaiseExact(amount.indicativeLinePaise)}</dd></div>
          </dl>
        </article>;
      })}
      <button className="text-button" onClick={clear}>Clear selection</button>
    </div><aside className="summary-card"><h2>Indicative price summary</h2><div className="summary-row"><span>Total selected product lines</span><span>{lines.length}</span></div><div className="summary-row"><span>Total quantity</span><span>{totals.totalQuantity}</span></div><div className="summary-row"><span>Total original price</span><span>{formatPaiseExact(totals.originalPaise)}</span></div><div className="summary-row savings"><span>Total discount amount</span><span>{formatPaiseExact(savings)}</span></div><div className="summary-row"><span>Effective discount</span><span>{effectiveDiscount.toFixed(2)}%</span></div><div className="summary-total"><span>Indicative discounted price</span><strong>{formatPaiseExact(totals.indicativePaise)}</strong></div><p>Prices are indicative and may change. This calculator does not create an order, reservation or purchase request.</p><PersonalEstimateDownload lines={lines}/><button className="button button-gold information-request-trigger" onClick={() => setRequestOpen(true)}>Send Information Request</button></aside></div>}
    {requestOpen&&<InformationRequestForm topics={lines.map(({product})=>({id:product.id,name:product.name}))} onClose={()=>setRequestOpen(false)}/>}
  </main>;
}
