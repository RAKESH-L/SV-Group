/** Lightweight skeleton for slow data-route transitions.
 * It preserves the regular page shell and product grid footprint while
 * Next.js streams the actual page. No new content or persistent layout.
 */
export function CatalogueLoadingSkeleton({ label = "Loading products…" }: { label?: string }) {
  return <main className="page-shell sv-route-loading" aria-busy="true">
    <div className="sv-loading-eyebrow" aria-hidden="true"/>
    <div className="sv-loading-heading" aria-hidden="true"/>
    <div className="sv-loading-subheading" aria-hidden="true"/>
    <p className="sv-loading-status" role="status">{label}</p>
    <div className="sv-loading-controls" aria-hidden="true"><span/><span/></div>
    <div className="sv-loading-products" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="sv-loading-product" key={index}>
          <div className="sv-loading-photo"/>
          <div className="sv-loading-copy"><span/><span/><span/></div>
        </div>
      ))}
    </div>
  </main>;
}
