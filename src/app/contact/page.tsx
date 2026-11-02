import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { business } from "@/lib/business";

export const metadata: Metadata = { title: "Contact | Sri Vinayaka Groups" };

export default function ContactPage() {
  return <main className="page-shell"><div className="eyebrow">WE’D LOVE TO HEAR FROM YOU</div><h1 className="page-title">Let’s <em>talk.</em></h1><p className="page-lede">Have a general question? Reach Sri Vinayaka Groups in Tumkur. We’ll be happy to help.</p>
    <section className="contact-cards" aria-label="Contact details">
      <a className="contact-card" href={business.phoneHref}><span className="contact-card-icon"><Phone size={19}/></span><span className="contact-card-label">CALL OUR TEAM</span><strong>{business.phone}</strong><span className="contact-card-link">Call now <span aria-hidden="true">↗</span></span></a>
      <a className="contact-card" href={business.emailHref}><span className="contact-card-icon"><Mail size={19}/></span><span className="contact-card-label">EMAIL US</span><strong>{business.email}</strong><span className="contact-card-link">Send an email <span aria-hidden="true">↗</span></span></a>
      <div className="contact-card"><span className="contact-card-icon"><MapPin size={19}/></span><span className="contact-card-label">OUR LOCATION</span><strong>{business.name}</strong><span className="contact-card-location">{business.address}</span></div>
    </section>
    <div className="contact-layout"><div className="contact-aside"><div className="contact-flower">✳</div><h2>Here for the<br/><em>little details.</em></h2><p>Send us a general enquiry and our team will get back to you.</p><a className="button button-outline" href={business.phoneHref}><Phone size={15}/> Call {business.phone}</a></div><ContactForm/></div><p className="catalogue-notice contact-notice">This form is for general enquiries only. It cannot submit products, cart contents, orders or reservations.</p>
  </main>;
}
