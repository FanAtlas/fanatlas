import { BackButton } from "../components/BackButton";
import { trackRevenueClick } from "../services/revenueTracking";

export function ESimPage({ onBack }: { onBack: () => void }) {
  const esimPlans = [
    {
      provider: "Airalo",
      title: "Airalo North America",
      data: "10GB Data",
      days: "30 Days",
      coverage: "USA • Canada • Mexico",
      price: "$9.99",
      bestFor: "Best for budget travelers",
      activation: "QR code install",
      hotspot: "Hotspot allowed",
      badges: ["Budget", "Regional"],
      url: "https://example.com/airalo-affiliate"
    },
    {
      provider: "Holafly",
      title: "Holafly Unlimited",
      data: "Unlimited Data",
      days: "15 Days",
      coverage: "USA • Canada • Mexico",
      price: "$19.90",
      bestFor: "Best for heavy internet use",
      activation: "App or QR setup",
      hotspot: "Hotspot varies by plan",
      badges: ["Unlimited", "Support"],
      url: "https://example.com/holafly-affiliate"
    },
    {
      provider: "Nomad",
      title: "Nomad World Cup Plan",
      data: "20GB Data",
      days: "30 Days",
      coverage: "USA • Canada • Mexico",
      price: "$14.99",
      bestFor: "Best for multi-country trips",
      activation: "Install before flight",
      hotspot: "Hotspot allowed",
      badges: ["Multi-country", "Value"],
      url: "https://example.com/nomad-affiliate"
    }
  ];

  const checklist = [
    "Phone is carrier-unlocked",
    "Device supports eSIM",
    "Install before match day crowds",
    "Keep your home SIM active for SMS codes"
  ];

  return (
    <>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">eSIM</div>
          <div className="subtle">Travel internet packages for World Cup fans</div>
        </div>
      </div>

      <div className="esim-hero">
        <span className="feature-emoji">📶</span>
        <div>
          <h3>Stay connected</h3>
          <p>Compare travel eSIM plans for USA, Canada, and Mexico before you land.</p>
        </div>
      </div>

      {esimPlans.map((plan) => (
        <div className="product-card esim-card" key={plan.provider}>
          <div className="thumb">📶</div>

          <div className="product-info">
            <div className="provider-row">
              <span>{plan.provider}</span>
              <strong>{plan.price}</strong>
            </div>
            <strong>{plan.title}</strong>
            <p>{plan.bestFor}</p>
            <p>{plan.data} • {plan.days}</p>
            <p>{plan.coverage}</p>
            <div className="esim-meta">
              <span>{plan.activation}</span>
              <span>{plan.hotspot}</span>
            </div>
            <div className="plan-badges">
              {plan.badges.map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          </div>

          <a
            className="buy-btn"
            href={plan.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackRevenueClick({
              type: "esim",
              product: plan.title,
              provider: plan.provider,
              amount: plan.price,
              url: plan.url,
              source: "eSIM Page"
            })}
          >
            View Plan
          </a>
        </div>
      ))}

      <div className="card-dark">
        <h3>Before you buy</h3>
        <div className="esim-checklist">
          {checklist.map((item) => (
            <div key={item}><span>✓</span>{item}</div>
          ))}
        </div>
      </div>
    </>
  );
}
