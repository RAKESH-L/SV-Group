"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles, Star, Flame } from "lucide-react";
import type { PromoCard } from "@/lib/site-promo-cards";

export function PromoCarousel({ cards }: { cards: PromoCard[] }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = cards.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const handle = window.setInterval(() => setActive(current => (current + 1) % count), 6500);
    return () => window.clearInterval(handle);
  }, [paused, reducedMotion, count]);

  if (count !== 3) return null;

  function goTo(index: number) {
    setActive(((index % count) + count) % count);
  }

  return (
    <section className="promo-carousel-band" aria-label="SV Groups featured announcements">
      <div className="promo-carousel-shell"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
        }}>
        <p className="promo-carousel-overline"><Sparkles size={12} aria-hidden="true"/> {t("FESTIVE HIGHLIGHTS")} <span aria-hidden="true">✦</span> {t("DISCOVER WHAT\u0027S NEW")}</p>
        <div className="promo-carousel-stage" aria-roledescription="carousel" aria-label="Three promotional cards">
          {cards.map((card, index) => {
            const distance = (index - active + count) % count;
            const position = distance === 0 ? "active" : distance === 1 ? "next" : "previous";
            const icon = index === 0 ? <Star size={25} strokeWidth={1.5}/> : index === 1 ? <Sparkles size={25} strokeWidth={1.5}/> : <Flame size={25} strokeWidth={1.5}/>;
            return (
              <article
                key={index}
                className={`promo-3d-card promo-3d-card-${index + 1} promo-3d-${position}`}
                aria-hidden={position !== "active"}
                aria-roledescription="slide"
                aria-label={`Announcement ${index + 1} of ${count}`}>
                <span className="promo-3d-ornament" aria-hidden="true">{icon}</span>
                <div className="promo-3d-copy">
                  <span className="promo-3d-eyebrow">{t(card.eyebrow)}</span>
                  <strong className="promo-3d-title">{t(card.title)}</strong>
                  <span className="promo-3d-description">{t(card.description)}</span>
                </div>
                {position === "active" && <Link className="promo-3d-link" href={card.linkHref} aria-label={`${card.linkText}: ${card.title}`}>
                  <span>{t(card.linkText)}</span><ArrowUpRight size={15} aria-hidden="true"/>
                </Link>}
                <span className="promo-3d-glimmer" aria-hidden="true">✧</span>
              </article>
            );
          })}
        </div>
        <nav className="promo-carousel-navigation" aria-label="Promotional card controls">
          <button type="button" className="promo-carousel-arrow" aria-label="Previous announcement" onClick={() => goTo(active - 1)}><ArrowLeft size={15}/></button>
          <div className="promo-carousel-dots" aria-label="Choose announcement">
            {cards.map((card, index) => (
              <button type="button" key={index} className={index === active ? "is-active" : ""} aria-label={`Show announcement ${index + 1}: ${card.title}`} aria-current={index === active ? "true" : undefined} onClick={() => goTo(index)} />
            ))}
          </div>
          <button type="button" className="promo-carousel-arrow" aria-label="Next announcement" onClick={() => goTo(active + 1)}><ArrowRight size={15}/></button>
          <span className="promo-carousel-count" aria-hidden="true">0{active + 1} / 03</span>
        </nav>
      </div>
    </section>
  );
}
