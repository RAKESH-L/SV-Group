"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/categories", label: "Categories" },
  { href: "/cart", label: "Price Calculator" },
  { href: "/contact", label: "Contact" },
];

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return <>
    <nav className="desktop-navigation" aria-label="Main navigation">
      {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
      <Link className="nav-cta" href="/contact">Talk to our team <span><ArrowUpRight size={14}/></span></Link>
    </nav>
    <div className="mobile-navigation">
      <button className="mobile-menu-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation-menu" onClick={() => setOpen(!open)}>
        {open ? <X size={21} aria-hidden="true"/> : <Menu size={21} aria-hidden="true"/>}
      </button>
      {open && <nav id="mobile-navigation-menu" className="mobile-navigation-menu" aria-label="Mobile navigation">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)}
      </nav>}
    </div>
  </>;
}
