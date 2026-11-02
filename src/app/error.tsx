"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error("Page rendering error", error); }, [error]); return <main className="page-shell"><div className="eyebrow">SV GROUPS</div><h1 className="page-title">A brief <em>pause.</em></h1><p className="page-lede">We couldn’t load this page just now. Please try again.</p><button className="button button-gold" onClick={reset}>Try again ↻</button></main>; }
