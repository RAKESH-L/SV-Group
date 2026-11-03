import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { business } from "@/lib/business";

export function Footer() {
  return <footer className="footer">
    <div className="footer-main">
      <div><Link href="/" className="brand footer-brand" aria-label={`${business.name} home`}><Image src="/branding/sv-logo-full.webp" alt={business.name} width={320} height={112}/></Link><p>A brighter celebration, made thoughtful.</p></div>
      <div className="footer-contact"><a href={business.phoneHref}><Phone size={14}/> {business.phone}</a><a href={business.emailHref}><Mail size={14}/> {business.email}</a><span><MapPin size={14}/> {business.address}</span></div>
      <div className="footer-links"><span className="footer-label">EXPLORE</span><Link href="/">Home</Link><Link href="/catalogue">Browse catalogue</Link><Link href="/categories">Categories</Link><Link href="/cart">Price calculator</Link><Link href="/contact">General enquiries</Link><Link href="/privacy">Privacy</Link><Link href="/legal-compliance">Legal Compliance</Link><Link href="/admin/login">Admin</Link></div>
    </div>
    <small>© {new Date().getFullYear()} {business.name} · Catalogue and indicative prices only. No online sales.</small>
  </footer>;
}
