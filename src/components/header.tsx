import Link from "next/link";
import { MapPin, Phone, Sparkles } from "lucide-react";
import { business } from "@/lib/business";

export function Header() {
  return <><div className="contact-strip"><div><a href={business.phoneHref}><Phone size={13} aria-hidden="true"/> {business.phone}</a><span className="strip-divider" aria-hidden="true"/><span><MapPin size={13} aria-hidden="true"/> {business.locality}</span></div><a className="strip-email" href={business.emailHref}>{business.email}</a></div><header className="site-header"><Link href="/" className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>SV <b>GROUPS</b></span></Link><nav><Link href="/catalogue">Catalogue</Link><Link href="/cart">Price calculator</Link><Link href="/contact">Contact</Link><Link className="nav-cta" href="/contact">Talk to our team <span>↗</span></Link></nav></header></>;
}
