import type { CartLine } from "@/lib/cart-calculations";
import { calculateCartTotals, formatPaiseExact } from "@/lib/cart-calculations";
export type SelectedItem = { id: string; quantity: number };
export const MAX_SHARED_ITEMS = 50;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function sanitizeSelectedItems(value: unknown): SelectedItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, number>();
  for (const entry of value.slice(0, MAX_SHARED_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const v = entry as Partial<SelectedItem>;
    if (!v.id || !ID_PATTERN.test(v.id)) continue;
    if (!Number.isInteger(v.quantity) || !v.quantity || v.quantity < 1 || v.quantity > 99) continue;
    items.set(v.id, v.quantity);
  }
  return [...items].map(([id, quantity]) => ({ id, quantity }));
}
export function productTopicsFromLines(lines: CartLine[]) {
  return lines.map(({ product, quantity }) => ({ name: product.name, quantity }));
}
export function makeProductTopicsText(items: Array<{name: string; quantity: number}>, heading = "Personal product list"): string {
  const topics = items.slice(0, 50).map((item, i) => `${i+1}. ${item.name.slice(0,120)} × ${Math.max(1, Math.trunc(item.quantity))}`).join("\n");
  return `Sri Vinayaka Groups — ${heading}\n\n${topics || "No products selected."}\n\nI would like general product information and availability details. This is not an online order, reservation or purchase request.\n\nCatalogue: https://sv-groups-catalogue.vercel.app/catalogue`;
}
export function makeEstimateText(lines: CartLine[]): string {
  const summary = calculateCartTotals(lines);
  const list = lines.slice(0, MAX_SHARED_ITEMS).map(({product, quantity}, index) =>
    `${index + 1}. ${product.name.slice(0,90)} × ${quantity} — ${formatPaiseExact(Math.round(product.discountedPrice * 100) * quantity)}`).join("\n");
  return `Sri Vinayaka Groups — Personal indicative price estimate\n\n${list}\n\nOriginal: ${formatPaiseExact(summary.originalPaise)}\nIndicative total: ${formatPaiseExact(summary.indicativePaise)}\nIndicative savings: ${formatPaiseExact(summary.originalPaise - summary.indicativePaise)}\n\nPrices and availability are indicative, may change, and are not a quotation. No order, payment, booking or reservation is created.\nhttps://sv-groups-catalogue.vercel.app/cart`;
}
export function encodeSelection(items: SelectedItem[]): string {
  const valid = sanitizeSelectedItems(items);
  return btoa(JSON.stringify({ v: 1, items: valid })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export function decodeSelection(value: string): SelectedItem[] {
  if (value.length < 7 || value.length > 3400 || !/^[A-Za-z0-9_-]+$/.test(value)) return [];
  try {
    const normal = value.replace(/-/g, "+").replace(/_/g, "/");
    const parsed: unknown = JSON.parse(atob(normal));
    if (!parsed || typeof parsed !== "object") return [];
    const p = parsed as { v?: unknown; items?: unknown };
    return p.v === 1 ? sanitizeSelectedItems(p.items) : [];
  } catch { return []; }
}
export function makeShareUrl(lines: CartLine[]): string {
  const code = encodeSelection(lines.map(({product, quantity}) => ({ id: product.id, quantity })));
  return `${window.location.origin}/cart?selection=${encodeURIComponent(code)}`;
}
export async function shareInformationText(text: string, url?: string): Promise<"shared" | "copied" | "cancelled" | "unavailable"> {
  const finalText = url ? `${text}\n\nOpen shared selection (current website prices): ${url}` : text;
  if (navigator.share) {
    try { await navigator.share({ title: "Sri Vinayaka Groups", text: finalText }); return "shared"; }
    catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try { await navigator.clipboard.writeText(finalText); return "copied"; }
  catch { return "unavailable"; }
}
export function openWhatsAppQuestion(text: string) {
  // Explicit interaction only. Do not send customer details to site backend.
  const prepared = text.length > 6000 ? text.slice(0, 5950) + "…" : text;
  window.open(`https://wa.me/919986885682?text=${encodeURIComponent(prepared)}`, "_blank", "noopener,noreferrer");
}
