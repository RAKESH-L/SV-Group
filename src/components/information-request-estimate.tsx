"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Minus, Plus, X } from "lucide-react";
import { calculateAdminEstimateLine, summarizeAdminEstimate } from "@/lib/admin-estimate";
import { formatPaiseExact, toPaise } from "@/lib/cart-calculations";

type Product = { name: string; status: "READY" | "INACTIVE" | "AMBIGUOUS" | "NOT_FOUND"; productId: string | null; categoryName: string | null; availability: string | null; originalPrice: string | null; discountedPrice: string | null; submittedQuantity?: number };
type Data = { enquiry: { reference: string; name: string; mobile: string; hasSubmittedQuantities: boolean }; products: Product[] };

export function InformationRequestEstimate({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busyRef.current) onClose(); };
    window.addEventListener("keydown", keydown);
    fetch(`/api/admin/information-requests/${encodeURIComponent(requestId)}/estimate`, { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load estimate products.");
        setData(result);
        const initial: Record<string, number> = {};
        for (const product of result.products as Product[]) if (product.productId) initial[product.productId] = product.submittedQuantity || 0;
        setQuantities(initial);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Could not load estimate products."))
      .finally(() => setLoading(false));
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); };
  }, [requestId, onClose]);

  const lines = useMemo(() => (data?.products || []).flatMap(product => {
    if (!product.productId || product.status !== "READY" || !product.categoryName || product.originalPrice === null || product.discountedPrice === null) return [];
    return [calculateAdminEstimateLine({ productId: product.productId, name: product.name, categoryName: product.categoryName, quantity: quantities[product.productId] || 0, originalUnitPaise: toPaise(Number(product.originalPrice)), indicativeUnitPaise: toPaise(Number(product.discountedPrice)) })];
  }), [data, quantities]);
  const totals = useMemo(() => summarizeAdminEstimate(lines), [lines]);
  const selected = lines.filter(line => line.quantity > 0);

  function setQuantity(productId: string, value: number) {
    const quantity = Number.isFinite(value) ? Math.max(0, Math.min(99, Math.trunc(value))) : 0;
    setQuantities(previous => ({ ...previous, [productId]: quantity }));
  }

  async function download() {
    if (busy || !selected.length) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const endpoint = `/api/admin/information-requests/${encodeURIComponent(requestId)}/estimate/pdf`;
      const recorded = Boolean(data?.enquiry.hasSubmittedQuantities);
      const response = await fetch(endpoint, recorded ? { method: "GET", cache: "no-store" } : {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: selected.map(line => ({ productId: line.productId, quantity: line.quantity })) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(typeof result?.error === "string" ? result.error : "Could not generate the estimate PDF. Refresh and try again.");
      }
      const blob = await response.blob();
      if (blob.type !== "application/pdf") throw new Error("The server returned an invalid PDF. Please try again.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "admin-price-estimate.pdf";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice(data?.enquiry.hasSubmittedQuantities ? "Recorded customer estimate PDF downloaded." : "Admin price estimate PDF downloaded. Quantities were not saved to the request.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not generate the estimate PDF."); }
    finally { setBusy(false); }
  }

  return <div className="information-modal-backdrop estimate-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="information-modal admin-estimate-modal" role="dialog" aria-modal="true" aria-labelledby="admin-estimate-title">
      <button type="button" className="information-modal-close" onClick={onClose} disabled={busy} aria-label="Close price estimate"><X size={19}/></button>
      <div className="eyebrow">ADMIN ONLY · CURRENT CATALOGUE VALUES</div>
      <h2 id="admin-estimate-title">Download a <em>price summary PDF.</em></h2>
      {loading ? <p role="status" className="page-lede">Loading request products…</p> : error && !data ? <p className="form-status error" role="alert">{error}</p> : data ? <>
        <div className="estimate-customer-panel"><div><small>CUSTOMER</small><strong>{data.enquiry.name}</strong><span>{data.enquiry.mobile}</span></div><div><small>ENQUIRY REFERENCE</small><strong>{data.enquiry.reference}</strong></div></div>
        <p className="estimate-editor-note">{data.enquiry.hasSubmittedQuantities ? "Customer-submitted quantities and server-verified indicative prices were recorded when this information enquiry was sent. These values are read-only and are not an order or reservation." : "This older enquiry did not record quantities. Products are matched by name to current indicative catalogue values. Enter illustrative quantities; they will not be saved or emailed."}</p>
        <div className="estimate-editor-products">
          {!data.products.length ? <p className="empty-state compact">This request has no product topics to estimate.</p> : data.products.map((product, index) => {
            const canEstimate = product.status === "READY" && !!product.productId;
            const quantity = product.productId ? quantities[product.productId] || 0 : 0;
            const price = canEstimate ? calculateAdminEstimateLine({ productId: product.productId!, name: product.name, categoryName: product.categoryName || "Not recorded", quantity, originalUnitPaise: toPaise(Number(product.originalPrice)), indicativeUnitPaise: toPaise(Number(product.discountedPrice)) }) : null;
            return <article className="estimate-editor-product" key={`${product.name}-${index}`}>
              <div className="estimate-editor-product-heading"><div><small>{product.categoryName || (product.status === "AMBIGUOUS" ? "Catalogue match needs review" : "Category not available")}</small><strong>{product.name}</strong>{product.availability&&<span>{product.availability}</span>}</div><span className={`estimate-match-status ${canEstimate ? "ready" : "unavailable"}`}>{product.status === "READY" ? "Current price" : product.status === "INACTIVE" ? "Inactive" : product.status === "AMBIGUOUS" ? "Ambiguous name" : "Not found"}</span></div>
              {price ? <><div className="estimate-editor-price-row"><span>Original {formatPaiseExact(price.originalUnitPaise)}</span><span>Indicative {formatPaiseExact(price.indicativeUnitPaise)}</span><span>{price.discountPercent.toFixed(2)}% off</span></div><div className="estimate-editor-controls"><label htmlFor={`estimate-quantity-${product.productId}`}>{data.enquiry.hasSubmittedQuantities ? "Customer-submitted quantity" : "Admin-entered quantity"}</label><div className="quantity"><button type="button" aria-label={`Decrease estimate quantity for ${product.name}`} disabled={data.enquiry.hasSubmittedQuantities || quantity <= 0} onClick={() => setQuantity(product.productId!, quantity - 1)}><Minus size={14}/></button><input id={`estimate-quantity-${product.productId}`} type="number" min="0" max="99" step="1" value={quantity} disabled={data.enquiry.hasSubmittedQuantities} onChange={event => setQuantity(product.productId!, Number(event.target.value))}/><button type="button" aria-label={`Increase estimate quantity for ${product.name}`} disabled={data.enquiry.hasSubmittedQuantities || quantity >= 99} onClick={() => setQuantity(product.productId!, quantity + 1)}><Plus size={14}/></button></div></div><div className="estimate-editor-line-total">{price.quantity > 0 ? <><span>Original total {formatPaiseExact(price.originalLinePaise)}</span><span>Savings {formatPaiseExact(price.savingsPaise)}</span><strong>Indicative total {formatPaiseExact(price.indicativeLinePaise)}</strong></> : <span>Set a quantity above zero to include this product.</span>}</div></> : <p className="estimate-unavailable-note">A unique active catalogue product could not be matched to this stored topic, so it is excluded from the estimate.</p>}
            </article>;
          })}
        </div>
        <aside className="summary-card estimate-editor-summary"><h3>Indicative price summary</h3><div className="summary-row"><span>Distinct products</span><span>{totals.distinctProducts}</span></div><div className="summary-row"><span>Total selected quantity</span><span>{totals.totalQuantity}</span></div><div className="summary-row"><span>Original subtotal</span><span>{formatPaiseExact(totals.originalSubtotalPaise)}</span></div><div className="summary-row savings"><span>Total discount / savings</span><span>{formatPaiseExact(totals.savingsPaise)}</span></div><div className="summary-row"><span>Effective discount</span><span>{totals.effectiveDiscountPercent.toFixed(2)}%</span></div><div className="summary-total"><span>Indicative final total</span><strong>{formatPaiseExact(totals.indicativeSubtotalPaise)}</strong></div></aside>
        {error&&<p className="form-status error" role="alert">{error}</p>}{notice&&<p className="form-status" role="status">{notice}</p>}
        <p className="estimate-editor-disclaimer">{data.enquiry.hasSubmittedQuantities ? "Customer-submitted quantities and indicative price snapshots for information only. No order, reservation, invoice or confirmation of sale." : "Admin-generated informational estimate. Quantities are administrator-entered and are not necessarily customer-submitted. This is not an order, reservation, invoice or confirmation of sale."}</p>
        <button type="button" className="button button-gold estimate-download-action" disabled={!selected.length||busy} onClick={download}><Download size={16}/>{busy ? "Preparing PDF…" : data.enquiry.hasSubmittedQuantities ? "Download Requested Items PDF" : "Download PDF with Price Summary"}</button>
      </> : null}
    </section>
  </div>;
}
