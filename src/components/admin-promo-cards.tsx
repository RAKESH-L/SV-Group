"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Layers3, Save } from "lucide-react";
import type { PromoCard } from "@/lib/site-promo-cards";

const destinations = [
  { value: "/catalogue", label: "Full catalogue" },
  { value: "/categories", label: "Categories" },
  { value: "/contact", label: "Contact" },
  { value: "/legal-compliance", label: "Legal information" },
] as const;

export function AdminPromoCards() {
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [published, setPublished] = useState<PromoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const changed = JSON.stringify(cards) !== JSON.stringify(published);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/promo-cards", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load the banner messages.");
        return data.cards as PromoCard[];
      })
      .then(next => {
        if (mounted) { setCards(next); setPublished(next); }
      })
      .catch(cause => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load the banner messages."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function edit(index: number, key: keyof PromoCard, value: string) {
    setCards(previous => previous.map((card, i) => i === index ? { ...card, [key]: value } : card));
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || cards.length !== 3) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/promo-cards", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cards }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish the banners.");
      setPublished(data.cards);
      setCards(data.cards);
      setNotice("All three banner messages are published. Visitors see the updates when they load or refresh the homepage.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish the banners.");
    } finally { setSaving(false); }
  }

  return (
    <section className="admin-panel promo-admin-panel">
      <div className="promo-admin-heading">
        <Layers3 size={27} aria-hidden="true"/>
        <div>
          <h2>Homepage 3D Banners</h2>
          <p>Edit the three scrolling announcement cards displayed directly below the public website header. The same content adapts automatically to your published Light or Dark theme.</p>
        </div>
      </div>
      {loading ? <p role="status">Loading published banners…</p> : cards.length === 3 ? (
        <form onSubmit={save}>
          <div className="promo-admin-grid">
            {cards.map((card, index) => (
              <fieldset className="promo-admin-card" key={index} disabled={saving}>
                <legend>Card {index + 1}</legend>
                <div className={`promo-admin-preview promo-admin-preview-${index + 1}`} aria-label="Banner text preview">
                  <span>{card.eyebrow || "LABEL"}</span>
                  <strong>{card.title || "Headline"}</strong>
                  <small>{card.description || "Short description"}</small>
                  <em>{card.linkText || "Explore"} <ArrowUpRight size={12}/></em>
                </div>
                <label>Small heading <span>(max 32 characters)</span>
                  <input required maxLength={32} minLength={2} value={card.eyebrow} onChange={event => edit(index, "eyebrow", event.target.value)}/>
                </label>
                <label>Main message <span>(max 54 characters)</span>
                  <input required maxLength={54} minLength={4} value={card.title} onChange={event => edit(index, "title", event.target.value)}/>
                </label>
                <label>Supporting message <span>(max 110 characters)</span>
                  <textarea required maxLength={110} minLength={8} rows={3} value={card.description} onChange={event => edit(index, "description", event.target.value)}/>
                </label>
                <div className="promo-admin-paired">
                  <label>Button text
                    <input required maxLength={24} minLength={2} value={card.linkText} onChange={event => edit(index, "linkText", event.target.value)}/>
                  </label>
                  <label>Button destination
                    <select value={card.linkHref} onChange={event => edit(index, "linkHref", event.target.value)}>
                      {destinations.map(target => <option key={target.value} value={target.value}>{target.label}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="promo-admin-actions">
            <button className="button button-gold" type="submit" disabled={saving || !changed}>
              {saving ? "Publishing changes…" : changed ? <><Save size={16}/> Publish all 3 cards</> : <><Check size={16}/> All changes published</>}
            </button>
            {changed && <button type="button" className="button button-outline" disabled={saving} onClick={() => { setCards(published.map(item => ({ ...item }))); setNotice(""); }}>Discard edits</button>}
            <a className="button button-outline" href="/" target="_blank" rel="noreferrer">Open public homepage</a>
          </div>
        </form>
      ) : !error ? <p role="status">Could not load the three cards. Refresh to retry.</p> : null}
      {error && <p className="form-status error" role="alert">{error}</p>}
      {notice && <p className="form-status" role="status">{notice}</p>}
      <p className="promo-admin-note">The carousel is informational only; it does not create bookings or purchases. Verify any savings or promotional claims before publishing. Animations pause on hover or keyboard focus and respect reduced-motion preferences.</p>
    </section>
  );
}
