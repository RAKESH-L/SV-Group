"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Save, Smartphone } from "lucide-react";
import { HeroMiniOffer } from "@/components/hero-mini-offer";
import {
  defaultMiniHeroOffer,
  type MiniHeroOffer,
} from "@/lib/site-hero-mini-offer";
import { promoLinkOptions, type PromoDestination } from "@/lib/site-promo-cards";
import type { PublicCoupon } from "@/lib/coupon";

type ApiResponse = { offer?: MiniHeroOffer; saved?: boolean; error?: string };

/** Admin → Banners: independently publishes the little offer in the upper-right
 * Light theme hero. Does not modify any of the 3 rotating card messages.
 */
export function AdminHeroMiniOfferEditor() {
  const [offer, setOffer] = useState<MiniHeroOffer>(defaultMiniHeroOffer);
  const [published, setPublished] = useState<MiniHeroOffer>(defaultMiniHeroOffer);
  const [customDestinations, setCustomDestinations] = useState<PromoDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCoupon, setActiveCoupon] = useState<PublicCoupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch("/api/admin/hero-mini-offer", { cache: "no-store", signal: controller.signal });
      const body = await response.json() as ApiResponse;
      if (!response.ok || !body.offer) throw new Error(body.error || "Could not load mini offer settings.");
      setOffer(body.offer);
      setPublished(body.offer);
      void fetch("/api/coupons/active", { cache: "no-store", signal: controller.signal })
        .then(async response => response.ok ? response.json() as Promise<{ coupon?: PublicCoupon | null }> : null)
        .then(data => { if (!controller.signal.aborted) setActiveCoupon(data?.coupon || null); })
        .catch(() => undefined);
      // Existing admin-managed destination choices are optional. The mini
      // offer always supports /install, /catalogue and the other built-ins.
      void fetch("/api/admin/promo-cards", { cache: "no-store", signal: controller.signal })
        .then(async result => result.ok ? result.json() as Promise<{ customDestinations?: PromoDestination[] }> : null)
        .then(result => { if (!controller.signal.aborted) setCustomDestinations(result?.customDestinations || []); })
        .catch(() => undefined);
    }
    void load().catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load the mini offer.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const changed = JSON.stringify(offer) !== JSON.stringify(published);
  const links = useMemo(() => [...promoLinkOptions, ...customDestinations], [customDestinations]);

  function edit<K extends keyof MiniHeroOffer>(key: K, value: MiniHeroOffer[K]) {
    setOffer(previous => ({ ...previous, [key]: value }));
    setError(""); setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !changed) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/hero-mini-offer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(offer),
      });
      const body = await response.json() as ApiResponse;
      if (!response.ok || !body.offer) throw new Error(body.error || "Could not publish this banner.");
      setPublished(body.offer);
      setOffer(body.offer);
      setNotice(body.offer.enabled
        ? "Mini offer published. Refresh the homepage to see it above the Light theme illustration."
        : "Mini offer hidden. Refresh the homepage to confirm it is no longer displayed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish this banner.");
    } finally { setSaving(false); }
  }

  function discard() { setOffer({ ...published }); setError(""); setNotice(""); }

  return <section className="admin-mini-offer-editor" aria-labelledby="admin-mini-offer-title">
    <div className="admin-mini-offer-heading">
      <div>
        <h3 id="admin-mini-offer-title"><Smartphone size={19} aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}/> Compact Hero Offer</h3>
        <p>Small app/offer banner in the upper-right of the Light homepage hero, above the festive artwork. Also adapts to the Dark theme. Edit, hide or republish it independently of Cards 1–3.</p>
      </div>
      <label className="admin-mini-offer-toggle">
        <input type="checkbox" checked={offer.enabled} disabled={loading || saving}
          onChange={event => edit("enabled", event.target.checked)}/>
        <span>{offer.enabled ? "Show banner" : "Banner hidden"}</span>
      </label>
    </div>

    {loading && <p className="admin-mini-offer-status" role="status">Loading offer banner settings…</p>}
    {error && <p className="admin-mini-offer-error" role="alert">{error}</p>}
    {notice && <p className="admin-mini-offer-success" role="status">{notice}</p>}

    {!loading && <form className="admin-mini-offer-form" onSubmit={event => void save(event)}>
      <div className="admin-mini-offer-preview">
        <span>Live design preview · {offer.enabled ? "Visible after publishing" : "Will be hidden after publishing"}</span>
        <HeroMiniOffer offer={{ ...offer, enabled: true }} coupon={activeCoupon}/>
      </div>

      <div className="admin-mini-offer-fields">
        <label>Small heading <small>Maximum 28 characters</small>
          <input required minLength={2} maxLength={28} value={offer.eyebrow}
            onChange={event => edit("eyebrow", event.target.value)} disabled={saving}/>
        </label>
        <label>Banner color
          <select value={offer.tone} disabled={saving}
            onChange={event => edit("tone", event.target.value as MiniHeroOffer["tone"])}>
            <option value="forest">Forest Green & Ivory</option>
            <option value="terracotta">Festive Terracotta</option>
            <option value="gold">Warm Gold</option>
          </select>
        </label>
        <label className="wide">Main message <small>Maximum 70 characters</small>
          <input required minLength={4} maxLength={70} value={offer.title}
            onChange={event => edit("title", event.target.value)} disabled={saving}/>
        </label>
        <label className="wide">Supporting text <small>Optional, maximum 140 characters</small>
          <textarea rows={2} maxLength={140} value={offer.description}
            onChange={event => edit("description", event.target.value)} disabled={saving}/>
        </label>
        <label>Button text <small>Maximum 24 characters</small>
          <input required minLength={2} maxLength={24} value={offer.buttonText}
            onChange={event => edit("buttonText", event.target.value)} disabled={saving}/>
        </label>
        <label>Button destination
          <select value={offer.linkHref} disabled={saving}
            onChange={event => edit("linkHref", event.target.value)}>
            {!links.some(item => item.value === offer.linkHref) &&
              <option value={offer.linkHref}>{offer.linkHref}</option>}
            <optgroup label="Website pages">
              {promoLinkOptions.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
            </optgroup>
            {!!customDestinations.length && <optgroup label="Your custom destinations">
              {customDestinations.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
            </optgroup>}
          </select>
        </label>
      </div>

      <div className="admin-mini-offer-actions">
        <button type="submit" className="button button-gold" disabled={saving || !changed}>
          {saving ? "Publishing…" : changed ? <><Save size={15}/> Publish mini offer</> : <><Check size={15}/> Mini offer published</>}
        </button>
        {changed && <button type="button" disabled={saving} className="button button-outline" onClick={discard}>
          <RotateCcw size={15}/> Discard changes
        </button>}
        <a href="/" className="button button-outline" target="_blank" rel="noopener noreferrer">View homepage</a>
      </div>
    </form>}
  </section>;
}
