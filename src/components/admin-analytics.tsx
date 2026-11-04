"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Eye, FileText, Info, MessageSquareText, RefreshCw, Users } from "lucide-react";
import { useRouter } from "next/navigation";

type Snapshot = { visitors: number; pageViews: number; informationRequests: number; generalEnquiries: number };
type Analytics = {
  timeZone: string;
  note: string;
  today: Snapshot;
  last30: Snapshot;
  allTime: Omit<Snapshot, "visitors">;
  daily: Array<{ date: string; visitors: number; pageViews: number; informationRequests: number; generalEnquiries: number }>;
  popularPages: Array<{ path: string; label: string; views: number }>;
};
type Series = keyof Snapshot;

const chartOptions: Array<{ key: Series; label: string }> = [
  { key: "visitors", label: "Visitors" },
  { key: "pageViews", label: "Page views" },
  { key: "informationRequests", label: "Information requests" },
  { key: "generalEnquiries", label: "General enquiries" },
];
const number = new Intl.NumberFormat("en-IN");
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}

export function AdminAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [series, setSeries] = useState<Series>("visitors");

  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch("/api/admin/analytics", {
        cache: "no-store", credentials: "same-origin", signal,
      });
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load website analytics.");
      setData(body as Analytics);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Could not load website analytics.");
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

  const maxDaily = Math.max(1, ...(data?.daily.map(day => day[series]) ?? [1]));
  const maxPageViews = Math.max(1, ...(data?.popularPages.map(page => page.views) ?? [1]));

  return <section className="analytics-admin-panel" aria-labelledby="analytics-title">
    <div className="analytics-heading">
      <div className="analytics-heading-copy">
        <span className="analytics-overline"><Activity size={15} aria-hidden="true"/> PRIVATE WEBSITE INSIGHTS</span>
        <h2 id="analytics-title">Your website, <em>at a glance.</em></h2>
        <p>See how many people explore SV Groups and how many enquiries arrive. Counts use India time (IST).</p>
      </div>
      <button className="analytics-refresh" type="button" onClick={refresh} disabled={loading || refreshing}>
        <RefreshCw size={16} className={refreshing ? "analytics-spinning" : ""} aria-hidden="true"/> Refresh
      </button>
    </div>

    {loading && <p role="status" className="analytics-status">Loading your website insights…</p>}
    {error && <div className="analytics-error" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div>}

    {data && <>
      <div className="analytics-section-label"><span>TODAY</span><span>Updated when you refresh</span></div>
      <div className="analytics-metrics">
        <Metric label="Unique visitors today" value={data.today.visitors} icon={<Users size={20}/>} note="Approximate browsers"/>
        <Metric label="Page views today" value={data.today.pageViews} icon={<Eye size={20}/>} note="Includes repeat views"/>
        <Metric label="Information requests today" value={data.today.informationRequests} icon={<FileText size={20}/>} note="Product information requests"/>
        <Metric label="General enquiries today" value={data.today.generalEnquiries} icon={<MessageSquareText size={20}/>} note="Contact form submissions"/>
      </div>
      <div className="analytics-section-label"><span>LAST 30 DAYS</span><span>Rolling reporting period</span></div>
      <div className="analytics-metrics">
        <Metric label="Unique visitors" value={data.last30.visitors} icon={<Users size={20}/>} note="Approximate distinct browsers"/>
        <Metric label="Page views" value={data.last30.pageViews} icon={<Eye size={20}/>} note="All page visits"/>
        <Metric label="Information requests" value={data.last30.informationRequests} icon={<FileText size={20}/>} note="Currently stored"/>
        <Metric label="General enquiries" value={data.last30.generalEnquiries} icon={<MessageSquareText size={20}/>} note="Currently stored"/>
      </div>

      <div className="analytics-split-grid">
        <section className="analytics-graph-card" aria-label="Daily website traffic chart">
          <div className="analytics-card-head">
            <div><h3><BarChart3 size={19}/> Daily activity</h3><p>Latest 14 days</p></div>
          </div>
          <div className="analytics-chart-toggles" role="group" aria-label="Chart metric">
            {chartOptions.map(option => (
              <button type="button" key={option.key} className={series === option.key ? "is-selected" : ""} aria-pressed={series === option.key} onClick={() => setSeries(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="analytics-chart-scroll">
            <div className="analytics-chart" role="img" aria-label={`Last 14 days of ${chartOptions.find(item => item.key === series)?.label.toLowerCase()}, shown as a daily bar chart`}>
              {data.daily.map(day => {
                const value = day[series];
                const size = value === 0 ? 0 : Math.max(5, value / maxDaily * 100);
                return <div className="analytics-chart-column" key={day.date} title={`${formatDate(day.date)}: ${number.format(value)}`}>
                  <span className="analytics-bar-number">{value ? number.format(value) : "·"}</span>
                  <div className="analytics-bar-rail">
                    <span className={`analytics-chart-bar ${value === 0 ? "is-empty" : ""}`} style={{ height: value === 0 ? "2px" : `${size}%` }}/>
                  </div>
                  <span className="analytics-bar-date">{formatDate(day.date)}</span>
                </div>;
              })}
            </div>
          </div>
          <p className="analytics-helper">Switch the metric above to compare visitors, views and enquiries by day.</p>
        </section>
        <section className="analytics-popular-card" aria-labelledby="analytics-pages-heading">
          <div className="analytics-card-head"><div><h3 id="analytics-pages-heading"><Eye size={19}/> Popular pages</h3><p>Page views in the last 30 days</p></div></div>
          {data.popularPages.length ? <div className="analytics-popular-list">
            {data.popularPages.map(page => <div className="analytics-popular-item" key={page.path}>
              <div className="analytics-popular-row"><span>{page.label}</span><strong>{number.format(page.views)}</strong></div>
              <div className="analytics-popular-track"><span style={{ width: `${Math.max(2, page.views / maxPageViews * 100)}%` }}/></div>
            </div>)}
          </div> : <p className="analytics-empty">No public page visits have been recorded yet.</p>}
        </section>
      </div>

      <div className="analytics-total-strip" aria-label="Recorded totals">
        <div><span>All-time tracked page views</span><strong>{number.format(data.allTime.pageViews)}</strong></div>
        <div><span>Stored information requests</span><strong>{number.format(data.allTime.informationRequests)}</strong></div>
        <div><span>Stored general enquiries</span><strong>{number.format(data.allTime.generalEnquiries)}</strong></div>
      </div>
      <p className="analytics-disclaimer"><Info size={16} aria-hidden="true"/>{data.note} Tracking excludes the admin area and visitors who opt out through supported browser privacy settings. This information is only visible to signed-in admins. <a href="/privacy" target="_blank" rel="noreferrer">Privacy details <ArrowUpRight size={13}/></a></p>
    </>}
  </section>;
}

function Metric({ label, value, icon, note }: { label: string; value: number; icon: React.ReactNode; note: string }) {
  return <div className="analytics-metric">
    <div className="analytics-metric-head"><span>{label}</span><span className="analytics-metric-icon">{icon}</span></div>
    <strong>{number.format(value)}</strong>
    <small>{note}</small>
  </div>;
}
