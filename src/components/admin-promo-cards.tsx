"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Layers3, Link2, Plus, Save, Trash2 } from "lucide-react";
import {
  isSafePromoPath,
  promoLinkOptions,
  type PromoCard,
  type PromoDestination,
} from "@/lib/site-promo-cards";

type PromoSettingsResponse = {
  cards: PromoCard[];
  customDestinations: PromoDestination[];
  error?: string;
};

export function AdminPromoCards() {
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [published, setPublished] = useState<PromoCard[]>([]);
  const [customDestinations, setCustomDestinations] = useState<PromoDestination[]>([]);
  const [publishedDestinations, setPublishedDestinations] = useState<PromoDestination[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newPath, setNewPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const changed = JSON.stringify(cards) !== JSON.stringify(published) ||
    JSON.stringify(customDestinations) !== JSON.stringify(publishedDestinations);
  const destinations = [...promoLinkOptions, ...customDestinations];

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/promo-cards", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as PromoSettingsResponse;
        if (!response.ok) throw new Error(data.error || "Could not load the banner settings.");
        return data;
      })
      .then(data => {
        if (!mounted) return;
        const custom = data.customDestinations || [];
        setCards(data.cards);
        setPublished(data.cards);
        setCustomDestinations(custom);
        setPublishedDestinations(custom);
      })
      .catch(cause => {
        if (mounted) setError(cause instanceof Error ? cause.message : "Could not load banner settings.");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function edit(index: number, key: keyof PromoCard, value: string) {
    setCards(previous => previous.map((card, i) => i === index ? { ...card, [key]: value } : card));
    setNotice("");
    setError("");
  }

  function addDestination() {
    setError("");
    setNotice("");
    const label = newLabel.trim();
    const entry = newPath.trim();
    const value = entry && !entry.startsWith("/") ? `/${entry}` : entry;
    if (label.length < 2 || label.length > 48) {
      setError("Enter a destination name between 2 and 48 characters.");
      return;
    }
    if (!isSafePromoPath(value)) {
      setError("Enter a safe public website path such as /new-feature. Full URLs, query strings, admin and API links are not allowed.");
      return;
    }
    if (destinations.some(item => item.value === value)) {
      setError("That website destination is already listed. Choose it from a card's dropdown.");
      return;
    }
    if (customDestinations.length >= 30) {
      setError("You can add up to 30 custom destinations.");
      return;
    }
    setCustomDestinations(previous => [...previous, { value, label }]);
    setNewLabel("");
    setNewPath("");
    setNotice(`Added "${label}" (${value}) to the list. Select it in any card, then publish your changes.`);
  }

  function removeDestination(value: string) {
    setError(""); setNotice("");
    if (cards.some(card => card.linkHref === value)) {
      setError("One of the cards is using this destination. Change its button destination before removing it.");
      return;
    }
    setCustomDestinations(previous => previous.filter(item => item.value !== value));
    setNotice("Destination removed from the editor. Publish to save the updated list.");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || cards.length !== 3) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/promo-cards", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cards, customDestinations }),
      });
      const data = await response.json() as PromoSettingsResponse;
      if (!response.ok) throw new Error(data.error || "Could not publish the banner settings.");
      setPublished(data.cards);
      setCards(data.cards);
      setCustomDestinations(data.customDestinations);
      setPublishedDestinations(data.customDestinations);
      setNotice("All three banner cards and the button destination list have been published. Visitors will see your updates when the homepage reloads.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish the banner settings.");
    } finally { setSaving(false); }
  }

  function discard() {
    setCards(published.map(card => ({ ...card })));
    setCustomDestinations(publishedDestinations.map(item => ({ ...item })));
    setNotice(""); setError("");
  }

  return (
    <section className="admin-panel promo-admin-panel">
      <div className="promo-admin-heading">
        <Layers3 size={27} aria-hidden="true"/>
        <div>
          <h2>Homepage 3D Banners</h2>
          <p>Edit the three announcement cards below the public header. Set each button to an existing page, or register a new public page for future website features.</p>
        </div>
      </div>
      {loading ? <p role="status">Loading published banners…</p> : cards.length === 3 ? (
        <form onSubmit={save}>
          <section className="promo-destination-manager" aria-labelledby="promo-destination-heading">
            <div className="promo-destination-heading">
              <Link2 size={21} aria-hidden="true"/>
              <div>
                <h3 id="promo-destination-heading">Button destinations</h3>
                <p>Install App and Website Developer are now built in. To support a future feature, register its public page path here; no code change is needed to add it to a banner.</p>
              </div>
            </div>
            <div className="promo-destination-builtins" aria-label="Available website pages">
              {promoLinkOptions.map(option => <span key={option.value} title={option.value}>{option.label} <small>{option.value}</small></span>)}
            </div>
            <div className="promo-destination-custom">
              <h4>My custom destinations <span>({customDestinations.length}/30)</span></h4>
              {customDestinations.length > 0 ? <ul className="promo-destination-list">
                {customDestinations.map(item => <li key={item.value}>
                  <span><strong>{item.label}</strong><code>{item.value}</code></span>
                  <button type="button" disabled={saving} onClick={() => removeDestination(item.value)}
                    aria-label={`Remove ${item.label} destination`} title="Remove custom destination">
                    <Trash2 size={16} aria-hidden="true"/>
                  </button>
                </li>)}
              </ul> : <p className="promo-destination-empty">No extra destinations yet. Use the fields below whenever a new website page becomes available.</p>}
              <div className="promo-destination-add">
                <label htmlFor="promo-destination-label">Destination name
                  <input id="promo-destination-label" value={newLabel} maxLength={48}
                    disabled={saving} placeholder="e.g. New Arrivals"
                    onChange={event => setNewLabel(event.target.value)}/>
                </label>
                <label htmlFor="promo-destination-path">Website page path
                  <input id="promo-destination-path" value={newPath} maxLength={120}
                    disabled={saving} placeholder="e.g. /new-arrivals"
                    onChange={event => setNewPath(event.target.value)}/>
                </label>
                <button type="button" className="button button-outline" onClick={addDestination} disabled={saving}>
                  <Plus size={16} aria-hidden="true"/> Add destination
                </button>
              </div>
              <p className="promo-destination-hint">Use an existing public page on SV Groups (example: <code>/install</code>). Only internal page paths are accepted. You can register a future page ahead of time, but its banner link will work only after that page is published. Removing a destination requires changing any cards currently using it.</p>
            </div>
          </section>
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
                      {!destinations.some(item => item.value === card.linkHref) && <option value={card.linkHref} disabled>Unavailable: {card.linkHref}</option>}
                      <optgroup label="Website pages">
                        {promoLinkOptions.map(target => <option key={target.value} value={target.value}>{target.label}</option>)}
                      </optgroup>
                      {customDestinations.length > 0 && <optgroup label="Custom destinations">
                        {customDestinations.map(target => <option key={target.value} value={target.value}>{target.label}</option>)}
                      </optgroup>}
                    </select>
                  </label>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="promo-admin-actions">
            <button className="button button-gold" type="submit" disabled={saving || !changed}>
              {saving ? "Publishing changes…" : changed ? <><Save size={16}/> Publish cards & destinations</> : <><Check size={16}/> All changes published</>}
            </button>
            {changed && <button type="button" className="button button-outline" disabled={saving} onClick={discard}>Discard edits</button>}
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
