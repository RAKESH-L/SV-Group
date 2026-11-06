import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { business } from "@/lib/business";
import { SvGroupsWordmark } from "@/components/sv-groups-wordmark";
import { T } from "@/components/language-provider";

export function Footer() {
  return <footer className="footer">
    <div className="footer-main">
      <div><Link href="/" className="brand footer-brand" aria-label={`${business.name} home`}><SvGroupsWordmark className="sv-wordmark-footer"/></Link><p><T text="A brighter celebration, made thoughtful."/></p></div>
      <div className="footer-contact"><a href={business.phoneHref}><Phone size={14}/> {business.phone}</a><a href={business.emailHref}><Mail size={14}/> {business.email}</a><span><MapPin size={14}/> {business.address}</span></div>
      <div className="footer-links"><span className="footer-label"><T text="EXPLORE"/></span><Link href="/"><T text="Home"/></Link><Link href="/catalogue"><T text="Browse catalogue"/></Link><Link href="/categories"><T text="Categories"/></Link><Link href="/cart"><T text="Price Calculator"/></Link><Link href="/wishlist"><T text="Favorites"/></Link><Link href="/notifications"><T text="Notifications"/></Link><Link href="/contact"><T text="General enquiries"/></Link><Link href="/install"><T text="Install App"/></Link><Link href="/privacy"><T text="Privacy"/></Link><Link href="/legal-compliance"><T text="Legal Compliance"/></Link><Link href="/developer"><T text="Website Developer"/></Link><Link href="/admin/login"><T text="Admin"/></Link></div>
    </div>
    <small className="footer-bottom"><span>© {new Date().getFullYear()} {business.name} · <T text="Catalogue and indicative prices only. No online sales."/></span><span className="footer-creator-credit"><T text="Website owner & developer:"/> <Link href="/developer">Rakesh L</Link> · <Link href="/developer"><T text="Need a website?"/></Link></span></small>
  </footer>;
}
