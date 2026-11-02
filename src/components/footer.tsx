import Link from "next/link";
import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { business } from "@/lib/business";

export function Footer() {
  return <footer className="footer"><div className="footer-main"><div><Link href="/" className="brand"><span className="brand-mark"><Sparkles size={17}/></span><span>SV <b>GROUPS</b></span></Link><p className="footer-name">{business.name}</p><p>A brighter celebration, made thoughtful.</p></div><div className="footer-contact"><a href={business.phoneHref}><Phone size={14}/> {business.phone}</a><a href={business.emailHref}><Mail size={14}/> {business.email}</a><span><MapPin size={14}/> {business.address}</span></div><div className="footer-links"><span className="footer-label">EXPLORE</span><Link href="/">Home</Link><Link href="/catalogue">Browse catalogue</Link><Link href="/cart">Price calculator</Link><Link href="/contact">General enquiries</Link><Link href="/admin/login">Admin</Link></div></div><small>© {new Date().getFullYear()} {business.name} · Catalogue and indicative prices only. No online sales.</small></footer>;
}
