"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, IndianRupee, Plus, Receipt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Order = { id: string; reference: string; amountPaise: number; createdAt: string };
type Totals = { count: number; totalPaise: number; todayCount: number; todayPaise: number; last30Count: number; last30Paise: number };
type Ledger = { items: Order[]; totals: Totals };

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function formatRecordedOrderValue(paise: number) {
  return currency.format(paise / 100);
}
export function AdminRecordedOrders({ onChange }: { onChange: () => Promise<void> }) {
  const router = useRouter();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [reference, setReference] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/recorded-orders", { cache: "no-store", credentials: "same-origin", signal });
    if (response.status === 401) { router.replace("/admin/login"); return; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not load confirmed order records.");
    setLedger(body as Ledger);
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load confirmed orders.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !reference.trim() || !amountRupees.trim()) return;
    const valid = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amountRupees.trim());
    const rupees = Number(amountRupees);
    if (!valid || !Number.isFinite(rupees) || rupees <= 0 || rupees > 10000000) {
      setError("Enter an amount above ₹0 and no more than ₹1,00,00,000, with up to 2 decimal places.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/recorded-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reference: reference.trim(), amountRupees: amountRupees.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not record order.");
      setReference("");
      setAmountRupees("");
      setNotice("Confirmed order recorded. The total amount has been updated.");
      await load();
      await onChange();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record order.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(order: Order) {
    if (saving || busyId) return;
    if (!window.confirm(`Delete confirmed order ${order.reference} for ${formatRecordedOrderValue(order.amountPaise)}?\n\nThe recorded total will decrease by this amount. This cannot be undone.`)) return;
    setError(""); setNotice(""); setBusyId(order.id);
    try {
      const response = await fetch("/api/admin/recorded-orders", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ id: order.id, reference: order.reference }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not delete recorded order.");
      setNotice(`Record ${order.reference} removed from the total.`);
      await load();
      await onChange();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove recorded order.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="analytics-orders-panel" aria-labelledby="analytics-orders-heading">
    <div className="analytics-orders-heading">
      <div>
        <span className="analytics-overline"><Receipt size={15} aria-hidden="true"/> PRIVATE ORDER RECORDS</span>
        <h3 id="analytics-orders-heading">Confirmed order amounts</h3>
        <p>Only record orders you have independently confirmed. The amount is entered by the admin, not taken from the website&apos;s information requests or price estimates.</p>
      </div>
      <span className="analytics-orders-icon"><IndianRupee size={28} aria-hidden="true"/></span>
    </div>
    {loading && <p role="status" className="analytics-status">Loading confirmed orders…</p>}
    {ledger && <div className="analytics-orders-summary">
      <div><small>TOTAL CONFIRMED ORDER VALUE</small><strong className="analytics-orders-value">{formatRecordedOrderValue(ledger.totals.totalPaise)}</strong></div>
      <div><small>CONFIRMED ORDERS</small><strong>{ledger.totals.count}</strong></div>
      <div><small>VALUE IN LAST 30 DAYS</small><strong>{formatRecordedOrderValue(ledger.totals.last30Paise)}</strong></div>
    </div>}
    <form className="analytics-orders-form" onSubmit={submit}>
      <div className="analytics-orders-form-title"><Plus size={18} aria-hidden="true"/> Add confirmed order</div>
      <label>Order reference
        <input required type="text" maxLength={64} minLength={2} pattern="[A-Za-z0-9 _#.\-]+" title="Letters, numbers, spaces, underscore, dash, hash or dot" placeholder="Example: ORD-001" value={reference} onChange={event => setReference(event.target.value)} disabled={saving}/>
      </label>
      <label>Final order value (₹)
        <input required type="text" inputMode="decimal" placeholder="Example: 6000" maxLength={20} value={amountRupees} onChange={event => setAmountRupees(event.target.value)} disabled={saving}/>
      </label>
      <button className="analytics-order-add" type="submit" disabled={saving}><CheckCircle2 size={17} aria-hidden="true"/>{saving ? "Recording…" : "Record confirmed order"}</button>
    </form>
    {error && <p className="analytics-error" role="alert">{error}</p>}
    {notice && <p className="analytics-order-success" role="status">{notice}</p>}
    {ledger && <div className="analytics-order-list">
      <div className="analytics-order-list-heading"><span>RECENT CONFIRMED ORDERS</span><span>Showing latest {ledger.items.length} of {ledger.totals.count}</span></div>
      {ledger.items.length ? <div className="analytics-order-table-scroll"><table className="analytics-order-table">
        <thead><tr><th>Reference</th><th>Recorded</th><th>Final value</th><th>Action</th></tr></thead>
        <tbody>{ledger.items.map(order => <tr key={order.id}>
          <td><strong>{order.reference}</strong></td>
          <td>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(order.createdAt))}</td>
          <td className="analytics-order-amount">{formatRecordedOrderValue(order.amountPaise)}</td>
          <td><button className="analytics-order-remove" type="button" disabled={saving || !!busyId} aria-label={`Delete order ${order.reference}`} onClick={() => void remove(order)}><Trash2 size={14} aria-hidden="true"/> {busyId === order.id ? "Removing…" : "Delete"}</button></td>
        </tr>)}</tbody>
      </table></div> : <p className="analytics-empty">No confirmed orders recorded yet. Example: record ORD-001 = ₹6,000, ORD-002 = ₹3,000 and ORD-003 = ₹2,000 to display ₹11,000.</p>}
    </div>}
    <p className="analytics-helper">This is a private, manually maintained record of confirmed offline orders, not a payment or checkout system. Adding an information request does not automatically create an order.</p>
  </section>;
}
