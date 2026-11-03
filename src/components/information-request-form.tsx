"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type RequestTopic = { id: string; name: string };
export function InformationRequestForm({ topics, onClose }: { topics: RequestTopic[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLInputElement>('.information-request-form input[name="name"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || reference) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/information-requests", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey, name: data.get("name"), mobile: data.get("mobile"), message: data.get("message"), consent: data.get("consent") === "on", website: data.get("website"), productIds: topics.map(topic => topic.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "We could not send your information request. Please try again.");
      setReference(typeof result.reference === "string" ? result.reference : "SVG-XXXXXX");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again shortly."); }
    finally { setBusy(false); }
  }

  return <div className="information-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="information-modal" role="dialog" aria-modal="true" aria-labelledby="information-request-title">
      <button className="information-modal-close" onClick={onClose} disabled={busy} aria-label="Close information request form"><X size={19}/></button>
      {reference ? <div className="information-success" role="status"><div className="eyebrow">REQUEST RECEIVED</div><h2 id="information-request-title">Thank you.</h2><p>Your information request has been received. Reference: <strong>{reference}</strong>.</p><p className="information-privacy">This is a general information enquiry only. It is not an order, reservation or purchase request.</p><button className="button button-gold" onClick={onClose}>Done</button></div> : <>
        <div className="eyebrow">GENERAL INFORMATION ONLY</div>
        <h2 id="information-request-title">Send an <em>information request.</em></h2>
        <p className="information-modal-intro">Share your contact details and the product topics you would like information about. No order or reservation will be created.</p>
        <form className="information-request-form" onSubmit={submit}>
          <label>Customer name<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name"/></label>
          <label>Mobile number<input name="mobile" type="tel" required inputMode="tel" autoComplete="tel" pattern="(\+91[ -]?)?[6-9][0-9]{9}" title="Enter a valid Indian mobile number, with optional +91 prefix." placeholder="+91 98765 43210"/></label>
          <label>General enquiry <span>(optional)</span><textarea name="message" maxLength={1000} rows={3} placeholder="What information can we help with?"/></label>
          <div className="information-topics"><strong>Product information topics</strong>{topics.length ? <ul>{topics.map(topic => <li key={topic.id}>{topic.name}</li>)}</ul> : <p>No specific products selected. You can still send a general enquiry.</p>}<p className="information-local-pricing-note">Only product names are included in this request. Calculator quantities and prices stay in your browser and are not sent.</p></div>
          <label className="information-consent"><input type="checkbox" name="consent" required/><span>I have read the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Notice</a> and understand this submission is for general information only.</span></label>
          <label className="information-honeypot" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label>
          {error && <p className="form-status error" role="alert">{error}</p>}
          <button className="button button-gold information-submit" disabled={busy}>{busy ? "Sending request…" : "Send information request ↗"}</button>
          <small>Your local calculator selection is not cleared when you submit.</small>
        </form>
      </>}
    </section>
  </div>;
}
