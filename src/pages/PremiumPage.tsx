import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Bot, Crown, Download, Languages, ShieldOff, Sparkles, Trophy } from "lucide-react";
import { Tab } from "../main";
import {
  activatePremium,
  cancelPremium,
  getPremiumSubscription,
  isPremiumActive,
  PremiumPlan,
  PremiumSubscription,
  resumePremium
} from "../services/premium";

const features = [
  {
    icon: ShieldOff,
    title: "Ad-free",
    detail: "Remove promotional placements and keep match-day tools focused."
  },
  {
    icon: Bot,
    title: "Premium AI",
    detail: "More detailed planning for stadiums, fan zones, hotels, SOS, and transport."
  },
  {
    icon: Download,
    title: "Offline Guides",
    detail: "Save before, during, and after-trip guides for low-signal match days."
  },
  {
    icon: Languages,
    title: "Premium Translation",
    detail: "Priority travel phrases for emergency, hotel, transit, restaurant, and stadium needs."
  },
  {
    icon: Trophy,
    title: "Match Day Pro",
    detail: "Pro checklist, reminders, route planning, and post-match fan zone flow."
  }
];

const plans: Array<{
  id: Exclude<PremiumPlan, "free">;
  name: string;
  price: string;
  summary: string;
}> = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$6.99",
    summary: "Best for a single trip or short tournament stay."
  },
  {
    id: "annual",
    name: "Annual",
    price: "$39.99",
    summary: "Best for multi-city travelers and future tournaments."
  }
];

function formatDate(value: string) {
  if (!value) return "Not active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not active";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
}

export function PremiumPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [subscription, setSubscription] = useState<PremiumSubscription>(() => getPremiumSubscription());
  const active = isPremiumActive(subscription);

  const statusCopy = useMemo(() => {
    if (subscription.status === "active") return "Active Premium";
    if (subscription.status === "canceled") return "Canceled, access ending";
    return "Free plan";
  }, [subscription.status]);

  useEffect(() => {
    setSubscription(getPremiumSubscription());
  }, []);

  function upgrade(plan: Exclude<PremiumPlan, "free">) {
    setSubscription(activatePremium(plan));
  }

  function cancel() {
    setSubscription(cancelPremium());
  }

  function resume() {
    setSubscription(resumePremium());
  }

  return (
    <div className="premium-page">
      <div className="topbar">
        <div>
          <div className="brand">FanAtlas <span>Premium</span></div>
          <div className="subtle">Ad-free travel tools for World Cup 2026</div>
        </div>
        <button className="small-dark-btn" onClick={() => setTab("profile")}>Back</button>
      </div>

      <section className="premium-hero-panel">
        <div className="premium-badge-large">
          <Crown size={26} />
          <span>{active ? "Premium Active" : "Upgrade"}</span>
        </div>
        <h1>FanAtlas Premium</h1>
        <p>Unlock Premium AI, offline guides, Premium Translation, Match Day Pro, and an ad-free app experience.</p>
      </section>

      <section className="premium-status-card">
        <div>
          <span className={`premium-status-pill ${active ? "active" : subscription.status}`}>
            <BadgeCheck size={14} /> {statusCopy}
          </span>
          <h3>Subscription management</h3>
          <p>
            Plan: <strong>{subscription.plan === "free" ? "Free" : subscription.plan}</strong>
            {" · "}
            Renewal/end date: <strong>{formatDate(subscription.renewsAt)}</strong>
          </p>
        </div>

        {subscription.status === "active" && (
          <button className="secondary-btn" onClick={cancel}>Cancel plan</button>
        )}

        {subscription.status === "canceled" && (
          <button className="primary-btn" onClick={resume}>Resume plan</button>
        )}
      </section>

      <h3>Premium features</h3>
      <div className="premium-feature-list">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div className="premium-feature-card" key={feature.title}>
              <span><Icon size={20} /></span>
              <div>
                <strong>{feature.title}</strong>
                <p>{feature.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <h3>Choose plan</h3>
      <div className="premium-plan-grid">
        {plans.map((plan) => (
          <article className={`premium-plan-card ${subscription.plan === plan.id && active ? "selected" : ""}`} key={plan.id}>
            <div>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.summary}</p>
            </div>
            <button className="primary-btn full-width" onClick={() => upgrade(plan.id)}>
              {subscription.plan === plan.id && active ? "Current plan" : "Upgrade"}
            </button>
          </article>
        ))}
      </div>

      <div className="action-note">
        <Sparkles size={18} />
        <span>Demo subscription management is local-first. Connect these actions to Stripe, RevenueCat, or Supabase billing in production.</span>
      </div>
    </div>
  );
}
