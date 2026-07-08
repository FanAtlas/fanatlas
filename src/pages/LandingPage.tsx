import {
  Bot,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Globe2,
  Hotel,
  Languages,
  LifeBuoy,
  ListChecks,
  Map,
  MapPin,
  Plane,
  Route,
  Shield,
  Smartphone,
  Utensils,
  WalletCards,
  Wifi
} from "lucide-react";

type LandingPageProps = {
  onOpenApp: () => void;
  onExploreEventMode: () => void;
  onNavigateLegal: (page: "privacy" | "terms" | "support") => void;
};

const heroCards = [
  { title: "Location-Based Travel", description: "Personalized nearby guidance wherever your trip takes you.", icon: MapPin },
  { title: "SOS Anywhere", description: "Find emergency help and important local safety information fast.", icon: Shield },
  { title: "Smart Maps", description: "Navigate hotels, restaurants, event areas, and saved places.", icon: Map },
  { title: "Hotels & Restaurants", description: "Discover useful places around your current location.", icon: Hotel },
  { title: "AI Travel Assistant", description: "Ask for help planning, translating, budgeting, and deciding.", icon: Bot },
  { title: "Travel Tools", description: "Currency, eSIM, checklists, expenses, offline guides, and more.", icon: Plane }
];

const features = [
  { label: "Hotels", icon: Hotel },
  { label: "Restaurants", icon: Utensils },
  { label: "Maps", icon: Map },
  { label: "SOS", icon: LifeBuoy },
  { label: "Currency", icon: CircleDollarSign },
  { label: "eSIM", icon: Smartphone },
  { label: "Translator", icon: Languages },
  { label: "Checklist", icon: CheckSquare },
  { label: "Expenses", icon: WalletCards },
  { label: "Offline Guides", icon: Wifi },
  { label: "AI Travel Assistant", icon: Bot },
  { label: "Event Mode", icon: CalendarDays }
];

const audience = ["Travelers", "Tourists", "Families", "Sports fans", "Event travelers", "Business travelers"];

const faqs = [
  {
    question: "Can I use FanAtlas outside the World Cup?",
    answer: "Yes. FanAtlas is built as a global travel companion for everyday trips, vacations, work travel, and major events."
  },
  {
    question: "Does FanAtlas replace Google Maps?",
    answer: "No. FanAtlas complements map apps by organizing travel tools, nearby discovery, safety, planning, and event context in one place."
  },
  {
    question: "Does SOS work by location?",
    answer: "Yes. SOS features are designed around your location so you can find nearby emergency help and relevant safety resources."
  },
  {
    question: "Is FanAtlas free?",
    answer: "FanAtlas offers free access to core travel tools, with more advanced features planned over time."
  },
  {
    question: "Is Premium coming?",
    answer: "Yes. Premium is planned for expanded travel assistance, event tools, and advanced planning features."
  }
];

export function LandingPage({ onOpenApp, onExploreEventMode, onNavigateLegal }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav" aria-label="FanAtlas">
        <button type="button" className="landing-brand" onClick={onOpenApp}>
          <Globe2 size={22} />
          <span>FanAtlas</span>
        </button>
        <button type="button" className="landing-nav-app" onClick={onOpenApp}>
          Open App
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-audience-row">
              {audience.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <h1>FanAtlas</h1>
            <h2>Your travel companion anywhere you go.</h2>
            <p>
              Find hotels, restaurants, maps, SOS help, eSIM, currency, translation, checklists, expenses,
              and AI travel tools based on your location.
            </p>
            <div className="landing-actions">
              <button type="button" className="primary-btn landing-cta" onClick={onOpenApp}>
                Start Free
              </button>
              <button type="button" className="secondary-btn landing-cta" onClick={onOpenApp}>
                Open Web App
              </button>
            </div>
          </div>

          <div className="landing-phone-preview" aria-label="Travel tools preview">
            <div className="landing-phone-top">
              <span>Nearby</span>
              <strong>Toronto</strong>
            </div>
            <div className="landing-map-panel">
              <MapPin size={26} />
              <Route size={42} />
              <Hotel size={26} />
            </div>
            <div className="landing-tool-strip">
              <span>SOS</span>
              <span>eSIM</span>
              <span>AI</span>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Travel-first</span>
            <h2>Built for trips, not just one event.</h2>
          </div>
          <div className="landing-card-grid">
            {heroCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="landing-feature-card" key={card.title}>
                  <Icon size={24} />
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>How FanAtlas Works</span>
            <h2>Go from arrival to action in three steps.</h2>
          </div>
          <div className="landing-steps">
            <article><strong>1</strong><span>Allow location</span></article>
            <article><strong>2</strong><span>Discover what is nearby</span></article>
            <article><strong>3</strong><span>Plan, save, and navigate your trip</span></article>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Features</span>
            <h2>Everything travelers need in one app.</h2>
          </div>
          <div className="landing-features-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.label}>
                  <Icon size={20} />
                  <span>{feature.label}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-event-section">
          <span>Featured Event</span>
          <h2>World Cup 2026</h2>
          <p>
            FanAtlas helps fans find stadiums, fan zones, hotels, restaurants, SOS help, and travel tools
            during major global events.
          </p>
          <button type="button" className="secondary-btn landing-cta" onClick={onExploreEventMode}>
            Explore Event Mode
          </button>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>FAQ</span>
            <h2>Quick answers for travelers.</h2>
          </div>
          <div className="landing-faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <button type="button" onClick={() => onNavigateLegal("privacy")}>Privacy Policy</button>
        <button type="button" onClick={() => onNavigateLegal("terms")}>Terms of Service</button>
        <button type="button" onClick={() => onNavigateLegal("support")}>Support</button>
        <button type="button" onClick={onOpenApp}>Open App</button>
      </footer>
    </div>
  );
}
