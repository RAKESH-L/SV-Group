"use client";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { calculateCartTotals, type CartLine } from "@/lib/cart-calculations";
import type { PublicCoupon } from "@/lib/coupon";
import { createPersonalEstimatePdf } from "@/lib/personal-estimate-pdf";

export function PersonalEstimateDownload({ lines, coupon }: { lines: CartLine[]; coupon?: PublicCoupon | null }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy || !lines.length) return;
    setBusy(true); setError("");
    try {
      // Always revalidate against the administrator's live coupon before
      // printing it. Disabled and expired codes must never appear in new PDFs.
      let verified: PublicCoupon | null = null;
      if (coupon) {
        const totals = calculateCartTotals(lines);
        const response = await fetch("/api/coupons/validate", {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          body: JSON.stringify({ code: coupon.code, subtotalPaise: totals.indicativePaise }),
        });
        const result = await response.json() as { coupon?: PublicCoupon; error?: string };
        if (!response.ok || !result.coupon) throw new Error(result.error || "Coupon is no longer valid. Remove it and retry.");
        verified = result.coupon;
      }
      const bytes = await createPersonalEstimatePdf(lines, verified);
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sri-vinayaka-groups-personal-price-estimate.pdf"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not create the estimate PDF. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="estimate-download"><button type="button" className="button button-outline estimate-download-button" onClick={download} disabled={busy}>{t(busy ? "Preparing estimate PDF…" : "Download Detailed Price Estimate PDF")}</button>{error&&<p className="form-status error" role="alert">{error}</p>}<small>{t("This personal estimate is generated in your browser. It is not sent to Sri Vinayaka Groups.")}</small></div>;
}
