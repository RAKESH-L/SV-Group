import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { business } from "@/lib/business";
import { MobileNavigation } from "@/components/mobile-navigation";
import { SvGroupsWordmark } from "@/components/sv-groups-wordmark";

export function Header() {
  return <><div className="contact-strip"><div><a href={business.phoneHref}><Phone size={13} aria-hidden="true"/> {business.phone}</a><span className="strip-divider" aria-hidden="true"/><span><MapPin size={13} aria-hidden="true"/> {business.locality}</span></div><a className="strip-email" href={business.emailHref}>{business.email}</a></div><header className="site-header"><Link href="/" className="brand brand-logo" aria-label={`${business.name} home`}><SvGroupsWordmark className="sv-wordmark-header"/></Link><MobileNavigation/></header></>;
}
