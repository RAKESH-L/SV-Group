import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPublicCatalogueSnapshot } from "@/lib/public-catalogue-data";
import { CatalogueClient } from "@/components/catalogue-client";
import { business } from "@/lib/business";
import { T } from "@/components/language-provider";
import { LegalComplianceNotice } from "@/components/legal-compliance-notice";

export const metadata: Metadata = { title: "Catalogue | SV Groups" };
export const dynamic = "force-dynamic";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const [params, snapshot] = await Promise.all([
    searchParams,
    getPublicCatalogueSnapshot().catch(() => null),
  ]);
  const requestedCategory = typeof params.category === "string" ? params.category : "all";
  const requestedQuery = typeof params.q === "string" ? params.q : "";
  const products = snapshot?.products || [];
  const categories = snapshot?.categories.map(({ name, slug }) => ({ name, slug })) || [];

  return <main className="page-shell">
    <div className="eyebrow"><T text="THE SV GROUPS SELECTION"/></div>
    <h1 className="page-title"><T text="A little"/> <em><T text="something"/></em><br/><T text="for every celebration."/></h1>
    <p className="page-lede"><T text="Explore the collection and compare indicative prices. Find just the right thing for your festive moments."/></p>
    <CatalogueClient products={products} categories={categories} initialCategory={requestedCategory} initialQuery={requestedQuery}/>
    <div className="catalogue-notice"><T text="This is an informational catalogue with an at-home price calculator. It does not support orders or reservations."/></div>
    <LegalComplianceNotice variant="compact"/>
    <div className="catalogue-contact"><div><span className="eyebrow"><T text="HERE TO HELP"/></span><strong><T text="Questions about the collection?"/></strong><span><T text="Call"/> {business.phone} · {business.locality}</span></div><Link href="/contact"><T text="Get in touch"/> <ArrowUpRight size={15}/></Link></div>
  </main>;
}
