import Link from "next/link";
import { ArrowUpRight, Gavel, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { business } from "@/lib/business";

const references = [
  {
    label: "Supreme Court judgment · 23 October 2018",
    href: "https://api.sci.gov.in/supremecourt/2015/32461/32461_2015_Judgement_23-Oct-2018.pdf",
  },
  {
    label: "PESO circular · 11 April 2023",
    href: "https://peso.gov.in/sites/default/files/2023-04/ban%20on%20online%20sale%20of%20fw.pdf",
  },
];

export function LegalComplianceNotice({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return <aside className="legal-notice-compact" aria-label="Legal compliance information">
      <span className="legal-compact-icon"><ShieldCheck size={19} aria-hidden="true"/></span>
      <p><strong>Legal compliance notice</strong><span>Browse product information only. This website does not accept firecracker orders or online sales.</span></p>
      <Link href="/legal-compliance">Read the notice <ArrowUpRight size={15} aria-hidden="true"/></Link>
    </aside>;
  }

  return <section className="legal-notice-full" aria-labelledby="legal-compliance-heading">
    <div className="legal-notice-decoration legal-decoration-one" aria-hidden="true"/>
    <div className="legal-notice-decoration legal-decoration-two" aria-hidden="true"/>
    <div className="legal-notice-content">
      <div className="legal-notice-heading-row">
        <div className="legal-notice-icon" aria-hidden="true"><Gavel size={25}/><ShieldCheck size={17}/></div>
        <div><span className="legal-notice-kicker">PUBLIC INFORMATION · SRI VINAYAKA GROUPS</span><h2 id="legal-compliance-heading">LEGAL COMPLIANCE NOTICE</h2></div>
      </div>

      <div className="legal-notice-copy">
        <p>In accordance with the directions issued by the Hon’ble Supreme Court of India on 23 October 2018, e-commerce websites shall not accept online orders or effect online sales of firecrackers.</p>
        <p>At <strong>Sri Vinayaka Groups</strong>, we value our customers and are committed to respecting applicable laws, regulations and safety requirements.</p>
        <p>This website is intended for browsing our catalogue, viewing product categories and understanding indicative product information. No online purchases, order confirmations, payments or delivery bookings for firecrackers are accepted through this website.</p>
        <p>For general product information and enquiries regarding applicable local requirements, customers may contact our team using the details below.</p>
        <p>Any sale, storage, transport or other regulated activity must comply with applicable licences, the Explosives Rules, Supreme Court directions and relevant government requirements.</p>
      </div>

      <div className="legal-notice-lower">
        <address className="legal-business-card">
          <strong>{business.name}</strong>
          <a href={business.phoneHref}><Phone size={15} aria-hidden="true"/> <span>Phone: {business.phone}</span></a>
          <a href={business.emailHref}><Mail size={15} aria-hidden="true"/> <span>Email: {business.email}</span></a>
          <span><MapPin size={15} aria-hidden="true"/> <span>Location: {business.address}</span></span>
        </address>
        <div className="legal-reference-block">
          <h3>Official references</h3>
          {references.map(reference => <a key={reference.href} href={reference.href} target="_blank" rel="noopener noreferrer">{reference.label}<ArrowUpRight size={14} aria-hidden="true"/></a>)}
        </div>
      </div>

      <div className="legal-notice-signoff"><p>Thank you for visiting Sri Vinayaka Groups. We appreciate your understanding and cooperation.</p><span><strong>{business.name}</strong><span>Legal notice for final business/legal review before commercial launch.</span></span></div>
    </div>
  </section>;
}
