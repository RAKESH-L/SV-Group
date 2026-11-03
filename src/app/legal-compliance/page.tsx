import type { Metadata } from "next";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";

export const metadata: Metadata = {
  title: "Legal Compliance Notice | Sri Vinayaka Groups",
  description: "Legal and public information about the Sri Vinayaka Groups catalogue.",
  alternates: { canonical: "/legal-compliance" },
};

export default function LegalCompliancePage() {
  return <main className="page-shell legal-page">
    <div className="eyebrow">IMPORTANT PUBLIC INFORMATION</div>
    <h1 className="page-title">Our commitment to <em>responsible information.</em></h1>
    <p className="page-lede">Please review how this website presents product information and its legal compliance information.</p>
    <LegalComplianceNotice/>
  </main>;
}
