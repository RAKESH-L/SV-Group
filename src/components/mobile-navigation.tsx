"use client";

import Link from "next/link";
import { ArrowUpRight, Languages, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

const links = [
  { href: "/", label: "Home" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/categories", label: "Categories" },
  { href: "/cart", label: "Price Calculator" },
  { href: "/contact", label: "Contact" },
  { href: "/install", label: "Install App" },
] as const;

function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return <div className={`sv-language-switcher${compact ? " sv-language-mobile" : ""}`} role="group" aria-label={t("Language")}>
    <Languages size={16} aria-hidden="true"/>
    <button type="button" lang="en" className={language === "en" ? "selected" : ""} aria-pressed={language === "en"}
      title={t("English")} onClick={() => setLanguage("en")}>EN</button>
    <button type="button" lang="kn" className={language === "kn" ? "selected" : ""} aria-pressed={language === "kn"}
      title={t("Kannada")} onClick={() => setLanguage("kn")}>ಕನ್ನಡ</button>
  </div>;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  return <>
    <nav className="desktop-navigation" aria-label={t("Main navigation")}>
      {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{t(link.label)}</Link>)}
      <Link className="nav-cta" href="/contact">{t("Talk to our team")} <span><ArrowUpRight size={14}/></span></Link>
    </nav>
    <div className="sv-language-desktop"><LanguageSwitcher/></div>
    <div className="mobile-navigation">
      <div className="sv-mobile-actions">
        <LanguageSwitcher compact/>
        <button className="mobile-menu-toggle" type="button" aria-label={t(open ? "Close navigation menu" : "Open navigation menu")}
          aria-expanded={open} aria-controls="mobile-navigation-menu" onClick={() => setOpen(!open)}>
          {open ? <X size={21} aria-hidden="true"/> : <Menu size={21} aria-hidden="true"/>}
        </button>
      </div>
      {open && <nav id="mobile-navigation-menu" className="mobile-navigation-menu" aria-label={t("Mobile navigation")}>
        {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)}>{t(link.label)}</Link>)}
      </nav>}
    </div>
  </>;
}
