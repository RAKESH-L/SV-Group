"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, EyeOff, PackageCheck, RefreshCw, Search, Save, Truck, XCircle } from "lucide-react";
import {
  availabilityKind, availabilityOption, fromStockQuantity,
  AVAILABILITY_OPTIONS, type AvailabilityOption, type AvailabilityKind,
} from "@/lib/inventory-status";
import type { InventoryRow } from "@/lib/inventory-store";
import { useRouter } from "next/navigation";

type Draft = { quantity: string; threshold: string; status: AvailabilityOption; active: boolean };
type ResponseBody = { products?: InventoryRow[]; error?: string };

function toDraft(product: InventoryRow): Draft {
  return {
    quantity: product.quantity === null ? "" : String(product.quantity),
    threshold: String(product.lowStockThreshold),
    status: availabilityOption(product.availability),
    active: product.active,
  };
}
function getPreview(draft: Draft) {
  const qty = draft.quantity.trim() === "" ? null : Number(draft.quantity);
  const threshold = Number(draft.threshold);
  if (qty === null || !Number.isInteger(qty) || !Number.isInteger(threshold) || qty < 0 || threshold < 0) return draft.status;
  return fromStockQuantity(qty, threshold, draft.status);
}
function kindName(kind: AvailabilityKind) {
  return kind === "in" ? "In stock"
    : kind === "low" ? "Low stock"
    : kind === "out" ? "Out of stock"
    : kind === "soon" ? "Coming soon" : "Other status";
}

export function InventoryDashboard({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [products, setProducts] = useState<InventoryRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/inventory", {
      credentials: "same-origin", cache: "no-store", signal,
    });
    if (response.status === 401) { router.replace("/admin/login"); return; }
    const result: ResponseBody = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the inventory dashboard.");
    const entries = result.products || [];
    setProducts(entries);
    setDrafts(Object.fromEntries(entries.map(row => [row.id, toDraft(row)])));
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Inventory could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try { await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Inventory could not be refreshed."); }
    finally { setBusy(false); }
  }

  function edit(id: string, field: keyof Draft, value: string | boolean) {
    setDrafts(previous => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }));
    setError(""); setNotice("");
  }

  async function save(product: InventoryRow) {
    const draft = drafts[product.id];
    if (!draft) return;
    const qtyText = draft.quantity.trim(), thresholdText = draft.threshold.trim();
    const quantity = qtyText === "" ? null : Number(qtyText);
    const lowStockThreshold = Number(thresholdText);
    if ((quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000))
      || thresholdText === "" || !Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000) {
      setError("Enter a non-negative whole-number stock quantity (or leave blank) and a valid non-negative low-stock threshold.");
      return;
    }
    setSavingId(product.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, quantity, lowStockThreshold, status: draft.status, active: draft.active }),
      });
      const result: ResponseBody = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this product.");
      await load();
      onSaved?.();
      setNotice(`Saved ${product.name}. Public availability now reflects the chosen or calculated stock status.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Product inventory could not be saved.");
    } finally { setSavingId(null); }
  }

  const categories = useMemo(() =>
    [...new Map(products.map(p => [p.categoryId, p.categoryName])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [products],
  );
  const totals = useMemo(() => {
    const published = products.filter(p => p.active);
    return {
      all: products.length,
      published: published.length,
      inStock: published.filter(p => availabilityKind(p.availability) === "in").length,
      low: published.filter(p => availabilityKind(p.availability) === "low").length,
      out: published.filter(p => availabilityKind(p.availability) === "out").length,
      soon: published.filter(p => availabilityKind(p.availability) === "soon").length,
      hidden: products.filter(p => !p.active).length,
      tracked: products.filter(p => p.quantity !== null).length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter(p => {
      if (category !== "all" && p.categoryId !== category) return false;
      if (status === "hidden" ? p.active : status !== "all" && (p.active === false || availabilityKind(p.availability) !== status)) return false;
      return words.every(word => [p.name, p.categoryName, p.availability].join(" ").toLowerCase().includes(word));
    });
  }, [products, category, search, status]);

  return <section className="inventory-admin-panel" aria-labelledby="inventory-heading">
    <div className="inventory-header">
      <div><span className="inventory-overline"><Boxes size={15} aria-hidden="true"/> ADMIN · MANUAL STOCK MANAGEMENT</span>
        <h2 id="inventory-heading">Inventory &amp; <em>Availability</em></h2>
        <p>Control what visitors see in the catalogue. Track optional quantities, set low-stock warnings, and hide or show products.</p>
      </div>
      <button className="button button-outline" type="button" disabled={busy || savingId !== null} onClick={() => void refresh()}>
        <RefreshCw size={16}/> Refresh
      </button>
    </div>

    {busy && <p className="inventory-loading" role="status">Loading your inventory…</p>}
    {error && <p className="inventory-alert" role="alert">{error}</p>}
    {notice && <p className="inventory-success" role="status">{notice}</p>}

    {!busy && <div className="inventory-metrics">
      <div><span><Boxes size={16}/> Total products</span><strong>{totals.all}</strong><small>{totals.published} visible</small></div>
      <div><span><PackageCheck size={16}/> In stock</span><strong>{totals.inStock}</strong><small>Visible products</small></div>
      <div><span><AlertTriangle size={16}/> Low stock</span><strong>{totals.low}</strong><small>Check soon</small></div>
      <div><span><XCircle size={16}/> Out of stock</span><strong>{totals.out}</strong><small>Not selectable</small></div>
      <div><span><Truck size={16}/> Coming soon</span><strong>{totals.soon}</strong><small>Not selectable</small></div>
      <div><span><EyeOff size={16}/> Hidden</span><strong>{totals.hidden}</strong><small>Not in public catalogue</small></div>
    </div>}

    <div className="inventory-filters">
      <label className="inventory-search"><Search size={18} aria-hidden="true"/>
        <input type="search" aria-label="Search inventory products" value={search} maxLength={100}
          placeholder="Search product name or category…" onChange={event => setSearch(event.target.value)}/>
      </label>
      <label>Category
        <select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <label>Status
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="soon">Coming soon</option>
          <option value="other">Other / legacy status</option>
          <option value="hidden">Hidden products</option>
        </select>
      </label>
    </div>

    <div className="inventory-list-heading"><strong>{filtered.length} of {products.length} products</strong>
      <span>{totals.tracked} products have manually recorded quantities</span>
    </div>
    <div className="inventory-products-list">
      {filtered.map(product => {
        const draft = drafts[product.id] || toDraft(product);
        const preview = getPreview(draft);
        const kind = availabilityKind(preview);
        const hasQuantity = draft.quantity.trim() !== "";
        const changed = draft.quantity !== (product.quantity === null ? "" : String(product.quantity))
          || draft.threshold !== String(product.lowStockThreshold)
          || draft.active !== product.active || preview !== product.availability;
        return <article className="inventory-product" key={product.id}>
          <div className="inventory-product-info">
            <div><strong>{product.name}</strong><small>{product.categoryName}</small></div>
            <span className={`inventory-status-chip ${kind}`}>{preview}</span>
            {!product.active && <span className="inventory-status-chip hidden">Currently hidden</span>}
            {availabilityKind(product.availability) === "other" && <small>Previous label: {product.availability}</small>}
          </div>
          <div className="inventory-product-controls">
            <label>Stock quantity
              <input type="number" inputMode="numeric" min={0} max={1000000} step={1}
                aria-label={`Stock quantity for ${product.name}`} value={draft.quantity}
                disabled={savingId !== null} placeholder="Not tracked"
                onChange={event => edit(product.id, "quantity", event.target.value)}/>
            </label>
            <label>Low-stock alert at
              <input type="number" inputMode="numeric" min={0} max={1000000} step={1}
                aria-label={`Low stock threshold for ${product.name}`} value={draft.threshold}
                disabled={savingId !== null} onChange={event => edit(product.id, "threshold", event.target.value)}/>
            </label>
            <label>Manual status
              <select aria-label={`Manual status for ${product.name}`} value={draft.status}
                disabled={savingId !== null || hasQuantity}
                onChange={event => edit(product.id, "status", event.target.value)}>
                {AVAILABILITY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="inventory-visibility"><input type="checkbox"
              checked={draft.active} disabled={savingId !== null}
              onChange={event => edit(product.id, "active", event.target.checked)}/>
              Show in catalogue
            </label>
            <button className="button button-gold inventory-save" type="button"
              disabled={savingId !== null || busy || !changed} onClick={() => void save(product)}>
              {savingId === product.id ? <><RefreshCw size={15}/> Saving…</> : <><Save size={15}/> Save</>}
            </button>
          </div>
          <div className="inventory-product-footer">
            <small>{hasQuantity ? "Status is calculated from quantity and threshold. Clear quantity to use manual status." : "Quantity untracked — manual status controls availability."}</small>
            {product.active && <Link href={`/catalogue/${product.slug}`} target="_blank" rel="noopener noreferrer">
              View product <span aria-hidden="true">↗</span>
            </Link>}
          </div>
        </article>;
      })}
      {!busy && filtered.length === 0 && <div className="inventory-empty">
        <CheckCircle2 size={26} aria-hidden="true"/>
        <h3>No matching products</h3>
        <p>Adjust the search or filters to see more products.</p>
        <button type="button" className="button button-outline"
          onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>Clear filters</button>
      </div>}
    </div>
    <p className="inventory-disclaimer">
      Inventory quantities are entered and maintained manually by an administrator. This site does not deduct stock when someone uses the price calculator or sends an information request; an enquiry does not reserve any product. Product availability is indicative and subject to confirmation.
    </p>
  </section>;
}
