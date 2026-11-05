"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { X } from "lucide-react";

export type RequestTopic = { id: string; name: string; quantity: number };
export function InformationRequestForm({ topics, onClose }: { topics: RequestTopic[]; onClose: () => void }) {
  const { t } = useLanguage();
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
        body: JSON.stringify({ idempotencyKey, name: data.get("name"), mobile: data.get("mobile"), message: data.get("message"), consent: data.get("consent") === "on", website: data.get("website"), items: topics.map(topic => ({ productId: topic.id, quantity: topic.quantity })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "We could not send your information request. Please try again.");
      setReference(typeof result.reference === "string" ? result.reference : "SVG-XXXXXX");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again shortly."); }
    finally { setBusy(false); }
  }

  return <div className="information-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="information-modal" role="dialog" aria-modal="true" aria-labelledby="information-request-title">
      <button className="information-modal-close" onClick={onClose} disabled={busy} aria-label={t("Close information request form")}><X size={19}/></button>
      {reference ? <div className="information-success" role="status"><div className="eyebrow">{t("REQUEST RECEIVED")}</div><h2 id="information-request-title">{t("Thank you.")}</h2><p>{t("Your information request has been received. Reference:")} <strong>{reference}</strong>.</p><p className="information-privacy">{t("This is a general information enquiry only. It is not an order, reservation or purchase request.")}</p><button className="button button-gold" onClick={onClose}>{t("Done")}</button></div> : <>
        <div className="eyebrow">{t("GENERAL INFORMATION ONLY")}</div>
        <h2 id="information-request-title">{t("Send an")} <em>{t("information request.")}</em></h2>
        <p className="information-modal-intro">{t("Share your contact details and selected products with their quantities for a non-binding, informational estimate. This does not place an order or reserve anything.")}</p>
        <form className="information-request-form" onSubmit={submit}>
          <label>{t("Customer name")}<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder={t("Your name")}/></label>
          <label>{t("Mobile number")}<input name="mobile" type="tel" required inputMode="tel" autoComplete="tel" pattern="(\+91[ -]?)?[6-9][0-9]{9}" title="Enter a valid Indian mobile number, with optional +91 prefix." placeholder="+91 98765 43210"/></label>
          <label>{t("General enquiry")} <span>{t("(optional)")}</span><textarea name="message" maxLength={1000} rows={3} placeholder={t("What information can we help with?")}/></label>
          <div className="information-topics"><strong>{t("Product information topics")}</strong>{topics.length ? <ul>{topics.map(topic => <li key={topic.id}>{topic.name} — {t("Qty")} {topic.quantity}</li>)}</ul> : <p>{t("No specific products selected. You can still send a general enquiry.")}</p>}<p className="information-local-pricing-note">{t("The selected product quantities will be sent with this information enquiry. The server records indicative catalogue price snapshots so the admin can view the same informational estimate. No purchase, order, reservation, or payment is created.")}</p></div>
          <label className="information-consent"><input type="checkbox" name="consent" required/><span>{t("I have read the")} <a href="/privacy" target="_blank" rel="noreferrer">{t("Privacy Notice")}</a> {t("and understand that my selected quantities and indicative prices are included for information only, not as an order or reservation.")}</span></label>
          <label className="information-honeypot" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label>
          {error && <p className="form-status error" role="alert">{error}</p>}
          <button className="button button-gold information-submit" disabled={busy}>{t(busy ? "Sending request…" : "Send information request ↗")}</button>
          <small>{t("Your local calculator selection is not cleared when you submit.")}</small>
        </form>
      </>}
    </section>
  </div>;
}
