"use client";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Clipboard, Link2, MessageCircle, Save, Share2, Trash2, Upload } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/components/language-provider";
import { type CartLine } from "@/lib/cart-calculations";
import {
  decodeSelection, encodeSelection, makeEstimateText, makeShareUrl,
  openWhatsAppQuestion, sanitizeSelectedItems, shareInformationText,
  type SelectedItem,
} from "@/lib/selection-sharing";

const KEY = "sv-saved-selections-v1";
type Snapshot = { id: string; name: string; savedAt: string; items: SelectedItem[] };
function readSnapshots(): Snapshot[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.slice(0, 5).flatMap((row: unknown) => {
      if (!row || typeof row !== "object") return [];
      const v = row as Partial<Snapshot>;
      if (typeof v.id !== "string" || v.id.length > 80 || typeof v.name !== "string" || v.name.length > 45 || typeof v.savedAt !== "string") return [];
      const items = sanitizeSelectedItems(v.items);
      return items.length ? [{ id: v.id, name: v.name, savedAt: v.savedAt, items }] : [];
    });
  } catch { return []; }
}
export function SelectionTools() {
  const { lines, ready, replace } = useCart();
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [name, setName] = useState("");
  const [shared, setShared] = useState<SelectedItem[]>([]);
  const [hasShare, setHasShare] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reload = () => setSnapshots(readSnapshots());
    reload();
    const token = new URLSearchParams(window.location.search).get("selection");
    if (token) { setHasShare(true); setShared(decodeSelection(token)); }
    window.addEventListener("storage", reload);
    return () => window.removeEventListener("storage", reload);
  }, []);

  const currentItems = useMemo(() => sanitizeSelectedItems(lines.map(({product,quantity}) => ({ id: product.id, quantity }))), [lines]);

  function persist(next: Snapshot[]) {
    setSnapshots(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { setNotice("Browser storage is unavailable. Your draft was not saved to this device."); }
  }
  function save() {
    if (!currentItems.length) return;
    const title = name.trim().slice(0,45) || `My selection ${new Date().toLocaleDateString("en-IN")}`;
    const row = { id: crypto.randomUUID?.() || String(Date.now()), name: title, savedAt: new Date().toISOString(), items: currentItems };
    persist([row, ...snapshots].slice(0, 5));
    setName("");
    setNotice("Selection saved in this browser. You can restore it later, even after clearing the calculator.");
  }
  function removeSaved(id: string) {
    persist(snapshots.filter(row => row.id !== id));
    setNotice("Saved selection deleted from this browser.");
  }
  async function restore(items: SelectedItem[], fromShare = false) {
    if (busy || !items.length) return;
    if (lines.length && !window.confirm("Replace your current calculator items with this saved selection?")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/selection/resolve", {
        method: "POST", headers: {"Content-Type":"application/json"},
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ items }),
      });
      const body = await response.json() as { lines?: CartLine[]; unavailable?: number; error?: string };
      if (!response.ok || !body.lines) throw new Error(body.error || "Could not load the current product details.");
      if (!body.lines.length) throw new Error("These products are no longer available in the public catalogue.");
      replace(body.lines);
      setNotice(`Selection restored with current indicative prices. ${body.unavailable ? body.unavailable + " inactive or missing product(s) were skipped." : ""}`);
      if (fromShare) {
        window.history.replaceState(null, "", "/cart");
        setHasShare(false); setShared([]);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not restore selection."); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!lines.length) return;
    const text = makeEstimateText(lines);
    const url = makeShareUrl(lines);
    const outcome = await shareInformationText(text, url);
    if (outcome === "copied") setNotice("Estimate and a reloadable selection link copied.");
    else if (outcome === "unavailable") setNotice("Sharing isn't available in this browser.");
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(makeShareUrl(lines)); setNotice("Selection link copied. Anyone with it can load current indicative prices."); }
    catch { setNotice("Clipboard isn't available here. Try Share Estimate instead."); }
  }
  return <section className="sv-selection-tools" aria-labelledby="sv-selection-tools-title">
    <header><span><Bookmark size={21} aria-hidden="true"/> <strong id="sv-selection-tools-title">{t("Save & Share My Selection")}</strong></span>
      <p>{t("Keep up to five named selections on this device, share a link with family, or ask our team a product-information question.")}</p>
    </header>
    {hasShare && <div className="sv-shared-selection-prompt" role="status">
      <div><strong>{shared.length ? "A shared selection is available" : "This shared selection link is invalid"}</strong>
        <p>{shared.length ? `Load ${shared.length} product(s) with their current indicative prices. This replaces your existing calculator items.` : "Ask the sender to share a new selection link."}</p></div>
      {shared.length > 0 && <button type="button" className="button button-gold" disabled={busy} onClick={() => void restore(shared, true)}><Upload size={15}/> Load shared selection</button>}
    </div>}
    {lines.length > 0 && <div className="sv-selection-actions">
      <button type="button" className="button button-gold" onClick={() => void share()}><Share2 size={16}/>{t("Share Estimate")}</button>
      <button type="button" className="button button-outline" onClick={() => void copyLink()}><Link2 size={16}/>{t("Copy Selection Link")}</button>
      <button type="button" className="button button-outline" onClick={() => openWhatsAppQuestion(makeEstimateText(lines))}><MessageCircle size={16}/>{t("Ask on WhatsApp")}</button>
    </div>}
    <div className="sv-save-selection-box">
      <label htmlFor="sv-selection-name">{t("Name this selection")}</label>
      <div className="sv-save-selection-input"><input id="sv-selection-name" maxLength={45} value={name} placeholder="e.g. Family Deepavali ideas" onChange={event => setName(event.target.value)}/>
        <button className="button button-gold" disabled={!ready || !currentItems.length || busy} type="button" onClick={save}><Save size={16}/>{t("Save My Selection")}</button></div>
    </div>
    {!!snapshots.length && <div className="sv-saved-selection-list"><strong>{t("Saved on this device")} ({snapshots.length}/5)</strong>
      <ul>{snapshots.map(row => <li key={row.id}><span><strong>{row.name}</strong><small>{row.items.length} products · {new Date(row.savedAt).toLocaleDateString("en-IN")}</small></span>
        <div><button type="button" className="mini-button" disabled={busy} onClick={() => void restore(row.items)}><Upload size={13}/> {t("Restore")}</button>
          <button type="button" className="mini-button" aria-label={`Delete ${row.name}`} onClick={() => removeSaved(row.id)} disabled={busy}><Trash2 size={15}/></button></div>
      </li>)}</ul></div>}
    {notice && <p className="sv-feature-notice" role="status"><Clipboard size={14}/> {notice}</p>}
    <p className="sv-feature-footnote">Selections stay only on this browser, not in an account or server. Shared links contain product IDs and quantities only, not personal details. Resuming any selection loads current active catalogue prices. Sharing or opening WhatsApp does not submit an order, booking or reservation.</p>
  </section>;
}
