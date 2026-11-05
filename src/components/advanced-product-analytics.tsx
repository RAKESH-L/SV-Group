"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Eye, FileText, Info, PackageSearch, RefreshCw, ShoppingBasket, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

type InsightData = {
  periodDays: number;
  timeZone: string;
  totals: {
    productViewsToday: number;
    productViews30: number;
    submittedQuantity30: number;
    enquiries30: number;
    requestsWithQuantities30: number;
    trackedVisitors30: number;
    requestsPer100Visitors30: number | null;
  };
  topProducts: Array<{ id: string; name: string; slug: string | null; category: string; views: number }>;
  topCategories: Array<{ id: string; name: string; views: number }>;
  selectedProducts: Array<{ productId: string; name: string; category: string; quantity: number; requests: number }>;
  daily: Array<{
    date: string;
    visitors: number;
    productViews: number;
    informationRequests: number;
    selectedQuantity: number;
    requestsPer100Visitors: number | null;
  }>;
  notes: { viewTracking: string; categoryTracking: string; selections: string; enquiries: string };
};

type ChartKey = "productViews" | "informationRequests" | "selectedQuantity" | "requestsPer100Visitors";
const n = new Intl.NumberFormat("en-IN");
const chartKeys: Array<{ key: ChartKey; label: string }> = [
  { key: "productViews", label: "Product views" },
  { key: "informationRequests", label: "Enquiries" },
  { key: "selectedQuantity", label: "Selected qty" },
  { key: "requestsPer100Visitors", label: "Enquiries / 100 visitors" },
];

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(date + "T00:00:00Z"));
}

function InsightMetric({ label, value, subtitle, icon }: {
  label: string; value: string; subtitle: string; icon: React.ReactNode;
}) {
  return <div className="advanced-metric">
    <div className="advanced-metric-title"><span>{label}</span><span className="advanced-metric-icon">{icon}</span></div>
    <strong>{value}</strong>
    <small>{subtitle}</small>
  </div>;
}

function RankedList({
  title, subtitle, items, maxValue, empty,
}: {
  title: string;
  subtitle: string;
  items: Array<{ id: string; label: string; detail?: string; value: number; link?: string }>;
  maxValue: number;
  empty: string;
}) {
  return <section className="advanced-rank-card">
    <div className="advanced-card-heading"><h4>{title}</h4><p>{subtitle}</p></div>
    {items.length === 0 ? <p className="advanced-rank-empty">{empty}</p>
      : <ol className="advanced-rank-list">{items.map((item, index) => (
        <li key={item.id}>
          <span className="advanced-rank-position">{String(index + 1).padStart(2, "0")}</span>
          <div className="advanced-rank-body">
            <div className="advanced-rank-topline">
              <span className="advanced-rank-name">
                {item.link ? <Link href={item.link} target="_blank" rel="noopener noreferrer">{item.label} <ArrowUpRight size={12} aria-hidden="true"/></Link> : item.label}
                {item.detail && <small>{item.detail}</small>}
              </span>
              <strong>{n.format(item.value)}</strong>
            </div>
            <div className="advanced-rank-track"><span style={{ width: `${Math.max(2, item.value / Math.max(1, maxValue) * 100)}%` }}/></div>
          </div>
        </li>
      ))}</ol>}
  </section>;
}

export function AdvancedProductAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<ChartKey>("productViews");

  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch("/api/admin/advanced-product-analytics", {
        cache: "no-store", credentials: "same-origin", signal,
      });
      if (response.status === 401) { router.replace("/admin/login"); return; }
      const payload: InsightData & { error?: string } = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load product analytics.");
      setData(payload);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Could not load product analytics.");
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  const topProductViews = Math.max(1, ...(data?.topProducts.map(row => row.views) ?? [1]));
  const topCategoryViews = Math.max(1, ...(data?.topCategories.map(row => row.views) ?? [1]));
  const maxQuantity = Math.max(1, ...(data?.selectedProducts.map(row => row.quantity) ?? [1]));
  const maxDaily = Math.max(1, ...(data?.daily.map(day => day[chart] ?? 0) ?? [1]));

  return <section className="advanced-products" aria-labelledby="advanced-products-title">
    <div className="analytics-section-label">
      <span>ADVANCED PRODUCT ANALYTICS</span><span>Last 30 days · IST</span>
    </div>
    <div className="advanced-products-heading">
      <div>
        <h3 id="advanced-products-title"><PackageSearch size={22} aria-hidden="true"/> Product interest &amp; enquiry insights</h3>
        <p>Understand which catalogue details visitors explore and what they include in information enquiries.</p>
      </div>
      <button type="button" className="analytics-refresh" onClick={() => void refresh()} disabled={loading || refreshing}>
        <RefreshCw size={15} className={refreshing ? "analytics-spinning" : ""} aria-hidden="true"/>
        Refresh product insights
      </button>
    </div>
    {loading && <p className="analytics-status" role="status">Loading product interest insights…</p>}
    {error && <div className="analytics-error" role="alert">
      <span>{error}</span>
      <button type="button" onClick={() => void refresh()}>Retry</button>
    </div>}
    {data && <>
      <div className="advanced-metrics">
        <InsightMetric label="Product-detail views · 30 days" value={n.format(data.totals.productViews30)}
          subtitle={`${n.format(data.totals.productViewsToday)} views today · repeated opens included`}
          icon={<Eye size={20}/>} />
        <InsightMetric label="Products in submitted enquiries" value={n.format(data.totals.submittedQuantity30)}
          subtitle={`Total quantity · ${n.format(data.totals.requestsWithQuantities30)} enquiries with items`}
          icon={<ShoppingBasket size={20}/>} />
        <InsightMetric label="Information enquiries · 30 days" value={n.format(data.totals.enquiries30)}
          subtitle="Submitted general product-information requests"
          icon={<FileText size={20}/>} />
        <InsightMetric label="Enquiries / 100 tracked visitors"
          value={data.totals.requestsPer100Visitors30 === null ? "—" : data.totals.requestsPer100Visitors30.toFixed(1)}
          subtitle={`${n.format(data.totals.trackedVisitors30)} approximate browsers · not a sales rate`}
          icon={<TrendingUp size={20}/>} />
      </div>

      <div className="advanced-rank-grid">
        <RankedList title="Most-viewed products" subtitle="Individual product-detail visits (30 days)"
          maxValue={topProductViews} empty="No individual product visits recorded yet. Rankings start from this deployment."
          items={data.topProducts.map(item => ({
            id: item.id, label: item.name, detail: item.category, value: item.views,
            link: item.slug ? `/catalogue/${encodeURIComponent(item.slug)}` : undefined,
          }))}/>
        <RankedList title="Popular categories" subtitle="Product-detail views grouped by category (30 days)"
          maxValue={topCategoryViews} empty="Category interest will appear as product detail pages are viewed."
          items={data.topCategories.map(item => ({
            id: item.id, label: item.name, value: item.views,
          }))}/>
        <RankedList title="Most-requested product quantities" subtitle="Submitted information enquiries only (30 days)"
          maxValue={maxQuantity} empty="No submitted enquiries with verified product quantities have been recorded."
          items={data.selectedProducts.map(item => ({
            id: item.productId, label: item.name, detail: `${item.category} · ${n.format(item.requests)} enquiries`,
            value: item.quantity,
          }))}/>
      </div>

      <div className="advanced-trends-card">
        <div className="advanced-card-heading">
          <h4><BarChart3 size={18} aria-hidden="true"/> Enquiry &amp; interest trends</h4>
          <p>Latest 14 days · requests and quantities are not confirmed orders</p>
        </div>
        <div className="advanced-chart-choices" role="group" aria-label="Advanced product analytics chart metric">
          {chartKeys.map(option => <button key={option.key} type="button"
            aria-pressed={chart === option.key} className={chart === option.key ? "selected" : ""}
            onClick={() => setChart(option.key)}>{option.label}</button>)}
        </div>
        <div className="advanced-chart-scroller">
          <div className="advanced-chart-grid" role="img" aria-label={`Daily ${chartKeys.find(option => option.key === chart)?.label} over the previous 14 days`}>
            {data.daily.map(day => {
              const value = day[chart];
              const height = value === null || value === 0 ? 0 : Math.max(5, value / maxDaily * 100);
              return <div className="advanced-chart-day" key={day.date}
                title={`${formatDay(day.date)}: ${value === null ? "Not available (no tracked visitors)" : n.format(value)}`}>
                <span className="advanced-chart-value">{value === null ? "—" : value === 0 ? "·" : n.format(value)}</span>
                <span className="advanced-chart-rail"><span className={height === 0 ? "empty" : ""}
                  style={{ height: height === 0 ? "2px" : `${height}%` }}/></span>
                <span className="advanced-chart-date">{formatDay(day.date)}</span>
              </div>;
            })}
          </div>
        </div>
        <p className="advanced-trend-note">“Enquiries / 100 visitors” compares daily requests with approximate daily tracked browsers. A dash means no visitor denominator was recorded.</p>
      </div>

      <div className="advanced-notes">
        <Info size={17} aria-hidden="true"/>
        <div>
          <strong>How to read these figures</strong>
          <p>{data.notes.viewTracking}</p>
          <p>{data.notes.categoryTracking}</p>
          <p>{data.notes.selections}</p>
          <p>{data.notes.enquiries}</p>
        </div>
      </div>
    </>}
  </section>;
}
