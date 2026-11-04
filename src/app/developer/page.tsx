import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Code2, Globe2, Laptop, Mail, MonitorSmartphone, Phone, Sparkles } from "lucide-react";

const developer = {
  name: "Rakesh L",
  mobile: "8050036244",
  mobileHref: "tel:+918050036244",
  email: "Rakeshlokesh2880@gmail.com",
  emailHref: "mailto:Rakeshlokesh2880@gmail.com?subject=Website%20Development%20Enquiry",
} as const;

export const metadata: Metadata = {
  title: "Website Developer | Rakesh L | SV Groups",
  description: "Meet Rakesh L, the website owner and developer. Get in touch to discuss designing, building or improving a website.",
};

export default function DeveloperPage() {
  return (
    <main className="developer-page">
      <div className="developer-page-inner">
        <Link className="developer-back-link" href="/"><ArrowLeft size={16} aria-hidden="true"/> Back to SV Groups</Link>
        <section className="developer-hero" aria-labelledby="developer-title">
          <div className="developer-copy">
            <div className="developer-kicker"><Sparkles size={17} aria-hidden="true"/> MEET THE PERSON BEHIND THE WEBSITE</div>
            <p className="developer-eyebrow">WEBSITE OWNER &amp; DEVELOPER</p>
            <h1 id="developer-title">Hello, I&apos;m <em>Rakesh L.</em></h1>
            <p className="developer-intro">I create thoughtfully designed websites that look great, feel easy to use, and work across mobile phones, tablets, laptops and desktops.</p>
            <p className="developer-intro-secondary">Planning a new website for your business, or looking to improve an existing one? Get in touch to discuss your idea and what you need.</p>
            <div className="developer-actions">
              <a className="developer-primary-action" href={developer.emailHref}><Mail size={18} aria-hidden="true"/> Discuss a website <ArrowUpRight size={17} aria-hidden="true"/></a>
              <a className="developer-secondary-action" href={developer.mobileHref}><Phone size={17} aria-hidden="true"/> Call Rakesh</a>
            </div>
          </div>
          <aside className="developer-profile" aria-label="Website developer contact details">
            <div className="developer-profile-top">
              <span className="developer-profile-orbit" aria-hidden="true"><Code2 size={38}/></span>
              <span className="developer-profile-small">THE PERSON BEHIND THE PIXELS</span>
              <strong className="developer-profile-monogram">RL<span>.</span></strong>
              <span className="developer-profile-role">DESIGN · DEVELOPMENT · WEB EXPERIENCES</span>
            </div>
            <div className="developer-profile-details">
              <span className="developer-profile-label">LET&apos;S CONNECT</span>
              <strong>{developer.name}</strong>
              <a href={developer.mobileHref}><Phone size={16} aria-hidden="true"/> {developer.mobile}</a>
              <a href={developer.emailHref}><Mail size={16} aria-hidden="true"/> {developer.email}</a>
            </div>
          </aside>
        </section>

        <section className="developer-services" aria-labelledby="developer-services-title">
          <div className="developer-section-heading">
            <span>WHAT I CAN HELP YOU WITH</span>
            <h2 id="developer-services-title">Your idea, <em>on the web.</em></h2>
            <p>Whether you need a simple online presence or a more detailed website, we can start with a conversation about your goals.</p>
          </div>
          <div className="developer-service-grid">
            <article><span className="developer-service-icon"><Globe2 size={24} aria-hidden="true"/></span><h3>Business websites</h3><p>Clear, professional pages that introduce your business, services and contact details.</p></article>
            <article><span className="developer-service-icon"><MonitorSmartphone size={24} aria-hidden="true"/></span><h3>Responsive design</h3><p>Layouts crafted to feel comfortable on mobiles, tablets, laptops and desktops.</p></article>
            <article><span className="developer-service-icon"><Laptop size={24} aria-hidden="true"/></span><h3>Website improvements</h3><p>Refresh an existing site with updated sections, better presentation and useful features.</p></article>
          </div>
        </section>

        <section className="developer-bottom-cta">
          <div><span>HAVE A WEBSITE IN MIND?</span><h2>Let&apos;s build something <em>beautiful.</em></h2><p>Tell me a little about the website you&apos;re looking for.</p></div>
          <a href={developer.emailHref}>Email Rakesh <ArrowUpRight size={19} aria-hidden="true"/></a>
        </section>
        <p className="developer-disclaimer">This page is for enquiries about website design and development by Rakesh L. For SV Groups products or business enquiries, please use the <Link href="/contact">SV Groups contact page</Link>.</p>
      </div>
    </main>
  );
}
