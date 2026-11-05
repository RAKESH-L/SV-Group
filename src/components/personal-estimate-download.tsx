"use client";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { CartLine } from "@/lib/cart-calculations";
import { createPersonalEstimatePdf } from "@/lib/personal-estimate-pdf";

export function PersonalEstimateDownload({ lines }: { lines: CartLine[] }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy || !lines.length) return;
    setBusy(true); setError("");
    try {
      const bytes = await createPersonalEstimatePdf(lines);
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sri-vinayaka-groups-personal-price-estimate.pdf"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not create the estimate PDF. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="estimate-download"><button type="button" className="button button-outline estimate-download-button" onClick={download} disabled={busy}>{t(busy ? "Preparing estimate PDF…" : "Download Detailed Price Estimate PDF")}</button>{error&&<p className="form-status error" role="alert">{error}</p>}<small>{t("This personal estimate is generated in your browser. It is not sent to Sri Vinayaka Groups.")}</small></div>;
}
