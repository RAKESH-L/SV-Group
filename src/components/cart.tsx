"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { calculateEffectiveDiscountPercent, calculateLineAmounts, formatPaiseExact } from "@/lib/cart-calculations";
import { useCart } from "@/components/cart-provider";
import { InformationRequestForm } from "@/components/information-request-form";
import { PersonalEstimateDownload } from "@/components/personal-estimate-download";
import { CouponEntry, useCouponApplication } from "@/components/cart-coupon";
import { SelectionTools } from "@/components/selection-tools";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

export function Cart() {
  const { lines, ready, totals, setQuantity, remove, clear } = useCart();
  const { t } = useLanguage();
  const [requestOpen, setRequestOpen] = useState(false);
  const coupon = useCouponApplication(ready, totals.indicativePaise);
  if (!ready) return <main className="page-shell"><div className="eyebrow">{t("YOUR PRICE CALCULATOR")}</div><h1 className="page-title">{t("Your")} <em>{t("selection")}</em></h1><p role="status" className="page-lede">{t("Loading your saved selection…")}</p></main>;
  const savings = totals.originalPaise - totals.indicativePaise;
  const effectiveDiscount = calculateEffectiveDiscountPercent(totals.originalPaise, totals.originalPaise - coupon.finalPaise);
  return <main className="page-shell"><div className="eyebrow">{t("YOUR PRICE CALCULATOR")}</div><h1 className="page-title">{t("Your")} <em>{t("selection")}</em></h1><p className="page-lede">{t("Compare indicative prices and savings for your own planning.")}</p>
    {!lines.length ? <div className="empty-state"><div className="empty-icon">✦</div><h2>{t("Your selection is empty")}</h2><p>{t("Add products from the catalogue to compare prices.")}</p><Link className="button button-gold" href="/catalogue">{t("Explore catalogue")}</Link></div> : <div className="cart-layout"><div className="cart-lines">
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
          <section className="cart-price-breakdown" aria-label={`Price breakdown for ${product.name}`}><h3>{t("Product price breakdown")}</h3><dl className="cart-line-pricing">
            <div><dt>{t("Quantity")}</dt><dd>{amount.quantity}</dd></div>
            <div><dt>{t("Original unit price")}</dt><dd>{formatPaiseExact(amount.originalUnitPaise)}</dd></div>
            <div><dt>{t("Discount percentage")}</dt><dd>{amount.discountPercent.toFixed(2)}%</dd></div>
            <div><dt>{t("Discounted unit price")}</dt><dd>{formatPaiseExact(amount.indicativeUnitPaise)}</dd></div>
            <div><dt>{t("Original line total")}</dt><dd>{formatPaiseExact(amount.originalLinePaise)}</dd></div>
            <div><dt>{t("Total savings")}</dt><dd>{formatPaiseExact(amount.savingsPaise)}</dd></div>
            <div className="cart-line-indicative"><dt>{t("Discounted / indicative line total")}</dt><dd>{formatPaiseExact(amount.indicativeLinePaise)}</dd></div>
          </dl></section>
        </article>;
      })}
      <button className="text-button" onClick={clear}>{t("Clear selection")}</button>
    </div><aside className="summary-card"><h2>{t("Indicative price summary")}</h2><div className="summary-row"><span>{t("Total selected product lines")}</span><span>{lines.length}</span></div><div className="summary-row"><span>{t("Total quantity")}</span><span>{totals.totalQuantity}</span></div><div className="summary-row"><span>{t("Total original price")}</span><span>{formatPaiseExact(totals.originalPaise)}</span></div><div className="summary-row savings"><span>{t("Catalogue discount / savings")}</span><span>{formatPaiseExact(savings)}</span></div>
      <div className="summary-row"><span>{t("Discounted subtotal before coupon")}</span><span>{formatPaiseExact(totals.indicativePaise)}</span></div>
      <CouponEntry application={coupon} subtotalPaise={totals.indicativePaise}/>
      {coupon.applied && <div className="summary-row savings coupon-savings-line"><span>{t("Additional coupon discount")} ({coupon.applied.percentOff}%)</span><strong>−{formatPaiseExact(coupon.savingsPaise)}</strong></div>}
      <div className="summary-row"><span>{t("Effective discount")}</span><span>{effectiveDiscount.toFixed(2)}%</span></div>
      <div className="summary-total"><span>{t("Indicative final total")}</span><strong>{formatPaiseExact(coupon.finalPaise)}</strong></div><p>{t("Prices are indicative and may change. This calculator does not create an order, reservation or purchase request.")}</p><PersonalEstimateDownload lines={lines} coupon={coupon.applied}/><button className="button button-gold information-request-trigger" onClick={() => setRequestOpen(true)}>{t("Send Information Request")}</button></aside></div>}
    <SelectionTools/>
    {requestOpen&&<InformationRequestForm topics={lines.map(({product,quantity})=>({id:product.id,name:product.name,quantity}))} onClose={()=>setRequestOpen(false)}/>}
  </main>;
}
