"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Check, CopyPlus, ImageIcon, Palette, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { drawPoster } from "@/lib/poster-canvas";
import {
  defaultPosterConfig,
  posterConfigSchema,
  posterFormats,
  posterStarterMessages,
  posterTemplates,
  type PosterConfig,
  type PosterDraft,
  type PosterProduct,
} from "@/lib/poster-studio";

type PosterStudioProps = { products: PosterProduct[] };
type AsyncResult = { drafts?: PosterDraft[]; id?: string; error?: string };

function safeName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "sv-groups-poster";
}

export function PosterStudio({ products }: PosterStudioProps) {
  const [config, setConfig] = useState<PosterConfig>({ ...defaultPosterConfig });
  const [draftName, setDraftName] = useState("My Festival Poster");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PosterDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imageWarning, setImageWarning] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef(new Map<string, Promise<HTMLImageElement | null>>());

  const product = useMemo(() => products.find(p => p.id === config.productId) || null, [products, config.productId]);
  const activeFormat = posterFormats[config.format];

  const refreshDrafts = useCallback(async () => {
    const response = await fetch("/api/admin/poster-studio", { cache: "no-store" });
    const data = await response.json() as AsyncResult;
    if (!response.ok) throw new Error(data.error || "Could not load saved posters.");
    setDrafts(data.drafts || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/poster-studio", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as AsyncResult;
        if (!response.ok) throw new Error(data.error || "Could not load saved posters.");
        if (mounted) setDrafts(data.drafts || []);
      })
      .catch(reason => { if (mounted) setError(reason instanceof Error ? reason.message : "Could not load saved posters."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const getProductImage = useCallback((selected: PosterProduct | null): Promise<HTMLImageElement | null> => {
    if (!selected?.imageUrl) return Promise.resolve(null);
    const found = imageCache.current.get(selected.id);
    if (found) return found;
    const pending = new Promise<HTMLImageElement | null>(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = `/api/admin/poster-studio/image/${encodeURIComponent(selected.id)}`;
    });
    imageCache.current.set(selected.id, pending);
    return pending;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const targetWidth = config.format === "banner" ? 720 : 370;
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * activeFormat.height / activeFormat.width);
    const draw = (image: HTMLImageElement | null) => drawPoster(context, config, product, image);
    draw(null);
    let cancelled = false;
    if (product?.imageUrl) {
      void getProductImage(product).then(image => {
        if (cancelled) return;
        draw(image);
        setImageWarning(image ? "" : "This product image could not be loaded. The poster uses the festive illustration instead.");
      });
    } else {
      setImageWarning("");
    }
    return () => { cancelled = true; };
  }, [config, product, activeFormat, getProductImage]);

  function edit<K extends keyof PosterConfig>(field: K, value: PosterConfig[K]) {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(""); setNotice("");
  }

  function chooseStarter(index: number) {
    const message = posterStarterMessages[index];
    setConfig(previous => ({
      ...previous,
      eyebrow: message.eyebrow,
      headline: message.headline,
      description: message.description,
      offer: message.offer,
    }));
    setNotice("Starter text applied. You can edit all fields before saving or downloading.");
  }

  function newDesign() {
    setCurrentDraftId(null);
    setDraftName("My Festival Poster");
    setConfig({ ...defaultPosterConfig });
    setError(""); setNotice("New unsaved design started.");
  }

  async function saveDraft() {
    const parsed = posterConfigSchema.safeParse(config);
    if (!parsed.success) {
      setError("Complete the headline, description, button text and other required fields before saving.");
      return;
    }
    if (draftName.trim().length < 2 || draftName.trim().length > 70) {
      setError("Give your poster a name between 2 and 70 characters.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/poster-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDraftId || undefined, name: draftName.trim(), config: parsed.data }),
      });
      const data = await response.json() as AsyncResult;
      if (!response.ok) throw new Error(data.error || "Could not save this poster.");
      setCurrentDraftId(data.id || null);
      setDrafts(data.drafts || []);
      setNotice("Poster saved privately. You can reopen it later from Saved Designs.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this poster.");
    } finally { setBusy(false); }
  }

  async function removeDraft() {
    if (!currentDraftId) return;
    if (!window.confirm(`Permanently delete saved design "${draftName}"? This cannot be undone.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/poster-studio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDraftId }),
      });
      const data = await response.json() as AsyncResult;
      if (!response.ok) throw new Error(data.error || "Could not delete this poster.");
      setDrafts(data.drafts || []);
      setCurrentDraftId(null);
      setNotice("Saved design deleted. Your editable preview remains available.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete saved design.");
    } finally { setBusy(false); }
  }

  async function download() {
    const parsed = posterConfigSchema.safeParse(config);
    if (!parsed.success) { setError("Check the poster text before downloading."); return; }
    setExporting(true); setError(""); setNotice("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = activeFormat.width; canvas.height = activeFormat.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not create the image.");
      const image = await getProductImage(product);
      drawPoster(ctx, parsed.data, product, image);
      const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!png) throw new Error("PNG export is unavailable in this browser.");
      const objectUrl = URL.createObjectURL(png);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `sv-groups-${safeName(draftName)}-${config.format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      setNotice(`PNG prepared at ${activeFormat.width} × ${activeFormat.height} pixels. The download should appear in your browser.`);
      if (product?.imageUrl && !image) setImageWarning("The selected product image could not be included; the festive illustration was used.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate your PNG.");
    } finally { setExporting(false); }
  }

  return (
    <section className="admin-panel poster-studio">
      <div className="poster-studio-header">
        <div>
          <p className="poster-studio-kicker"><Sparkles size={15}/> SVG DESIGN TOOLS</p>
          <h2>SV Groups <em>Poster Studio.</em></h2>
          <p>Design, preview and download promotional graphics without a subscription. All exports are generated locally in your browser.</p>
        </div>
        <button type="button" className="button button-outline" onClick={newDesign} disabled={busy || exporting}><CopyPlus size={16}/> New design</button>
      </div>

      <div className="poster-studio-grid">
        <div className="poster-studio-controls">
          <div className="poster-studio-control-section">
            <h3><Palette size={17}/> 1. Choose a look</h3>
            <div className="poster-template-options" role="group" aria-label="Poster templates">
              {(Object.keys(posterTemplates) as Array<keyof typeof posterTemplates>).map(key => {
                const t = posterTemplates[key];
                return <button type="button" key={key} className={`poster-template-button ${config.template === key ? "selected" : ""}`} aria-pressed={config.template === key} onClick={() => edit("template", key)}>
                  <span className="poster-template-swatch" style={{ background: t.bg, color: t.ink, borderColor: t.gold }}><span style={{ color: t.accent }}>✦</span> SV GROUPS</span>
                  <strong>{t.label}</strong>
                  <small>{t.description}</small>
                </button>;
              })}
            </div>
          </div>
          <div className="poster-studio-control-section">
            <h3><ImageIcon size={17}/> 2. Choose size and message</h3>
            <label className="poster-field">Export size
              <select value={config.format} onChange={e => edit("format", e.target.value as PosterConfig["format"])}>
                {(Object.keys(posterFormats) as Array<keyof typeof posterFormats>).map(key => <option value={key} key={key}>{posterFormats[key].label} — {posterFormats[key].width} × {posterFormats[key].height}</option>)}
              </select>
            </label>
            <label className="poster-field">Start from a message
              <select defaultValue="" onChange={e => { if (e.target.value !== "") chooseStarter(Number(e.target.value)); e.target.value = ""; }}>
                <option value="">Choose a preset message…</option>
                {posterStarterMessages.map((message, i) => <option value={i} key={i}>{message.label}</option>)}
              </select>
            </label>
            <label className="poster-field">Small heading <small>{config.eyebrow.length}/40</small>
              <input value={config.eyebrow} minLength={2} maxLength={40} onChange={e => edit("eyebrow", e.target.value)}/>
            </label>
            <label className="poster-field">Main headline <small>{config.headline.length}/75</small>
              <textarea rows={2} value={config.headline} minLength={3} maxLength={75} onChange={e => edit("headline", e.target.value)}/>
            </label>
            <label className="poster-field">Supporting message <small>{config.description.length}/170</small>
              <textarea rows={3} value={config.description} minLength={3} maxLength={170} onChange={e => edit("description", e.target.value)}/>
            </label>
            <label className="poster-field">Offer / highlight (optional) <small>{config.offer.length}/85</small>
              <textarea rows={2} value={config.offer} maxLength={85} onChange={e => edit("offer", e.target.value)}/>
            </label>
            <label className="poster-field">Bottom button or callout text <small>{config.buttonText.length}/40</small>
              <input value={config.buttonText} minLength={2} maxLength={40} onChange={e => edit("buttonText", e.target.value)}/>
            </label>
          </div>

          <div className="poster-studio-control-section">
            <h3><ImageIcon size={17}/> 3. Product and contact details</h3>
            <label className="poster-field">Show a product from your catalogue
              <select value={config.productId || ""} onChange={e => edit("productId", e.target.value || null)}>
                <option value="">Festive diya illustration (no product)</option>
                {products.map(p => <option value={p.id} key={p.id}>{p.categoryName} — {p.name}</option>)}
              </select>
            </label>
            <label className="poster-check"><input type="checkbox" checked={config.showQr} onChange={e => edit("showQr", e.target.checked)}/> Show scannable website QR code</label>
            <label className="poster-check"><input type="checkbox" checked={config.showPhone} onChange={e => edit("showPhone", e.target.checked)}/> Show contact number 9986885682</label>
            <small className="poster-note">QR always opens https://sv-groups-catalogue.vercel.app/. Product images are loaded securely from your own catalogue.</small>
          </div>

          <div className="poster-studio-control-section">
            <h3><Save size={17}/> 4. Save for later</h3>
            <label className="poster-field">Design name
              <input value={draftName} minLength={2} maxLength={70} onChange={e => setDraftName(e.target.value)}/>
            </label>
            <div className="poster-studio-actions">
              <button type="button" className="button button-gold" disabled={busy || exporting} onClick={() => void saveDraft()}><Save size={15}/>{busy ? "Saving…" : currentDraftId ? "Update saved design" : "Save design"}</button>
              {currentDraftId && <button type="button" className="button button-outline" disabled={busy || exporting} onClick={() => void removeDraft()}><Trash2 size={15}/> Delete saved</button>}
            </div>
            <label className="poster-field">Saved designs {loading ? "(loading…)" : `(${drafts.length})`}
              <select value={currentDraftId || ""} onChange={e => {
                const entry = drafts.find(d => d.id === e.target.value);
                if (entry) { setCurrentDraftId(entry.id); setDraftName(entry.name); setConfig(entry.config); setNotice(`Loaded "${entry.name}".`); setError(""); }
                else setCurrentDraftId(null);
              }}>
                <option value="">New / unsaved design</option>
                {drafts.map(d => <option key={d.id} value={d.id}>{d.name} — {new Date(d.updatedAt).toLocaleDateString("en-IN")}</option>)}
              </select>
            </label>
            <button className="poster-refresh-button" type="button" disabled={busy} onClick={() => { setError(""); void refreshDrafts().catch(e => setError(e instanceof Error ? e.message : "Refresh failed.")); }}><RefreshCw size={13}/> Refresh saved designs</button>
          </div>
        </div>

        <div className="poster-studio-preview">
          <div className="poster-preview-top"><div><strong>Live poster preview</strong><small>{activeFormat.label} · {activeFormat.width} × {activeFormat.height} px</small></div><span><Check size={13}/> No paid services</span></div>
          <div className="poster-preview-frame"><canvas ref={canvasRef} role="img" aria-label="Preview of the edited promotional poster" /></div>
          {imageWarning && <p className="poster-image-warning" role="status">{imageWarning}</p>}
          <button type="button" className="poster-download-button" disabled={exporting} onClick={() => void download()}><ArrowDownToLine size={18}/>{exporting ? "Generating high-resolution PNG…" : "Download High-Quality PNG"}</button>
          {error && <p className="form-status error" role="alert">{error}</p>}
          {notice && <p className="form-status" role="status">{notice}</p>}
          <p className="poster-note">Download includes your poster, website address and optional QR code. This tool creates information and catalogue graphics only, not online orders or booking confirmations.</p>
        </div>
      </div>
    </section>
  );
}
