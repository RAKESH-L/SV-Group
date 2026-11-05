import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { business } from "@/lib/business";
import { T } from "@/components/language-provider";

export const metadata: Metadata = { title: "Contact | Sri Vinayaka Groups" };

export default function ContactPage() {
  return <main className="page-shell"><div className="eyebrow"><T text="WE’D LOVE TO HEAR FROM YOU"/></div><h1 className="page-title"><T text="Let’s"/> <em><T text="talk."/></em></h1><p className="page-lede"><T text="Have a general question? Reach Sri Vinayaka Groups in Tumkur. We’ll be happy to help."/></p>
    <section className="contact-cards" aria-label="Contact details">
      <a className="contact-card" href={business.phoneHref}><span className="contact-card-icon"><Phone size={19}/></span><span className="contact-card-label"><T text="CALL OUR TEAM"/></span><strong>{business.phone}</strong><span className="contact-card-link"><T text="Call now"/> <span aria-hidden="true">↗</span></span></a>
      <a className="contact-card" href={business.emailHref}><span className="contact-card-icon"><Mail size={19}/></span><span className="contact-card-label"><T text="EMAIL US"/></span><strong>{business.email}</strong><span className="contact-card-link"><T text="Send an email"/> <span aria-hidden="true">↗</span></span></a>
      <div className="contact-card"><span className="contact-card-icon"><MapPin size={19}/></span><span className="contact-card-label"><T text="OUR LOCATION"/></span><strong>{business.name}</strong><span className="contact-card-location">{business.address}</span></div>
    </section>
    <div className="contact-layout"><div className="contact-aside"><div className="contact-flower">✳</div><h2><T text="Here for the"/><br/><em><T text="little details."/></em></h2><p><T text="Send us a general enquiry and our team will get back to you."/></p><a className="button button-outline" href={business.phoneHref}><Phone size={15}/> <T text="Call"/> {business.phone}</a></div><ContactForm/></div><p className="catalogue-notice contact-notice"><T text="This form is for general enquiries only. It cannot submit products, cart contents, orders or reservations."/></p>
  </main>;
}
