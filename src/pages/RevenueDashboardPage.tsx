import { useEffect, useMemo, useState } from "react";
import { BarChart3, MousePointerClick, Trash2 } from "lucide-react";
import {
  clearRevenueClicks,
  getRevenueClicks,
  RevenueClick,
  revenueEventName
} from "../services/revenueTracking";

function countBy(clicks: RevenueClick[], getKey: (click: RevenueClick) => string | undefined) {
  return Object.entries(
    clicks.reduce<Record<string, number>>((acc, click) => {
      const key = getKey(click);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

function formatClickType(type: RevenueClick["type"]) {
  if (type === "esim") return "eSIM";
  if (type === "vip") return "VIP Packages";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function RevenueDashboardPage() {
  const [clicks, setClicks] = useState<RevenueClick[]>(() => getRevenueClicks());

  useEffect(() => {
    function refresh() {
      setClicks(getRevenueClicks());
    }

    window.addEventListener(revenueEventName(), refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(revenueEventName(), refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const clicksByType = useMemo(() => countBy(clicks, (click) => formatClickType(click.type)), [clicks]);
  const topProducts = useMemo(() => countBy(clicks, (click) => click.product).slice(0, 6), [clicks]);
  const topStadiums = useMemo(() => countBy(clicks, (click) => click.stadium || click.city).slice(0, 6), [clicks]);

  function clearAnalytics() {
    clearRevenueClicks();
    setClicks([]);
  }

  return (
    <div className="revenue-dashboard-page">
      <div className="topbar">
        <div>
          <div className="brand">Link <span>Activity</span></div>
          <div className="subtle">External service click activity</div>
        </div>
      </div>

      <div className="revenue-hero">
        <MousePointerClick size={28} />
        <div>
          <h1>{clicks.length} clicks</h1>
          <p>Review hotel, eSIM, merchandise, VIP package, and transportation link clicks.</p>
        </div>
      </div>

      <section className="revenue-section">
        <h3>Clicks</h3>
        <div className="revenue-metric-grid">
          {clicksByType.map((item) => (
            <div className="revenue-metric" key={item.name}>
              <span>{item.name}</span>
              <strong>{item.clicks}</strong>
            </div>
          ))}
          {clicksByType.length === 0 && <p className="subtle">No external link clicks yet.</p>}
        </div>
      </section>

      <section className="revenue-section">
        <h3>Top Products</h3>
        {topProducts.map((item) => (
          <div className="revenue-rank-row" key={item.name}>
            <span>{item.name}</span>
            <strong>{item.clicks}</strong>
          </div>
        ))}
        {topProducts.length === 0 && <p className="subtle">Products appear after users click external service buttons.</p>}
      </section>

      <section className="revenue-section">
        <h3>Top Stadiums</h3>
        {topStadiums.map((item) => (
          <div className="revenue-rank-row" key={item.name}>
            <span>{item.name}</span>
            <strong>{item.clicks}</strong>
          </div>
        ))}
        {topStadiums.length === 0 && <p className="subtle">Stadium attribution appears when click context includes a stadium.</p>}
      </section>

      <section className="revenue-section">
        <h3>Recent Clicks</h3>
        {clicks.slice(0, 10).map((click) => (
          <div className="revenue-click-row" key={click.id}>
            <BarChart3 size={16} />
            <div>
              <strong>{click.product}</strong>
              <p>{formatClickType(click.type)} · {click.stadium || click.city || click.source}</p>
            </div>
            <span>{new Date(click.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
        {clicks.length === 0 && <p className="subtle">No recent clicks.</p>}
      </section>

      {clicks.length > 0 && (
        <button className="secondary-btn full-width" onClick={clearAnalytics}>
          <Trash2 size={16} /> Clear local analytics
        </button>
      )}
    </div>
  );
}
