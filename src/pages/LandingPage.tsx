import {
  Bot,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Globe2,
  Hotel,
  Languages,
  LifeBuoy,
  Map,
  MapPin,
  Navigation,
  Plane,
  Shield,
  Smartphone,
  Sparkles,
  Utensils,
  WalletCards,
  Wifi
} from "lucide-react";

type LandingPageProps = {
  onOpenApp: () => void;
  onExploreEventMode: () => void;
  onNavigateLegal: (page: "privacy" | "terms" | "support") => void;
};

const previewCards = [
  { title: "Find places near you", description: "Useful places around your destination, ready when you arrive.", icon: MapPin },
  { title: "Hotels & restaurants", description: "Search stays, food, cafes, and travel stops for the city you choose.", icon: Hotel },
  { title: "SOS by country", description: "Emergency numbers and nearby safety help based on destination.", icon: Shield },
  { title: "Smart maps", description: "See hotels, restaurants, transport, SOS, and saved trip places.", icon: Map },
  { title: "AI travel assistant", description: "Ask for planning help, local tips, translations, and trip ideas.", icon: Bot },
  { title: "Travel tools", description: "eSIM, currency, phrasebook, checklists, expenses, and offline guides.", icon: Plane }
];

const featureGrid = [
  { label: "SOS", icon: LifeBuoy },
  { label: "Hotels", icon: Hotel },
  { label: "Restaurants", icon: Utensils },
  { label: "Maps", icon: Map },
  { label: "eSIM", icon: Smartphone },
  { label: "Currency", icon: CircleDollarSign },
  { label: "Translator", icon: Languages },
  { label: "Checklist", icon: CheckSquare },
  { label: "Expenses", icon: WalletCards },
  { label: "Offline Guides", icon: Wifi },
  { label: "AI Assistant", icon: Bot },
  { label: "Event Mode", icon: CalendarDays }
];

const mockups = [
  { title: "Home", detail: "Cairo travel picks", items: ["Hotels", "Restaurants", "SOS"] },
  { title: "Explore", detail: "Places near destination", items: ["Attractions", "Food", "Transport"] },
  { title: "Map", detail: "Live destination view", items: ["Route", "Markers", "Saved"] },
  { title: "SOS", detail: "Local emergency help", items: ["Police", "Hospital", "Embassy"] },
  { title: "Travel Tools", detail: "Everything for the trip", items: ["eSIM", "Currency", "Checklist"] }
];

const heroScreens = [
  { name: "Home", value: "Cairo ready" },
  { name: "Explore", value: "12 essentials" },
  { name: "SOS", value: "Egypt help" },
  { name: "Map", value: "25 places" },
  { name: "Hotels", value: "Near you" }
];

export function LandingPage({ onOpenApp, onExploreEventMode, onNavigateLegal }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav" aria-label="FanAtlas">
        <button type="button" className="landing-brand" onClick={onOpenApp}>
          <Globe2 size={22} />
          <span>FanAtlas</span>
        </button>
        <nav className="landing-nav-links" aria-label="Landing navigation">
          <button type="button" onClick={onOpenApp}>App</button>
          <button type="button" onClick={onExploreEventMode}>Event Archive</button>
        </nav>
        <button type="button" className="landing-nav-app" onClick={onOpenApp}>
          Open Web App
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker"><Sparkles size={15} /> Global AI travel companion</span>
            <h1>Travel smarter anywhere in the world.</h1>
            <p>
              FanAtlas helps you find hotels, restaurants, maps, SOS help, translation, currency, eSIM,
              checklists, expenses, and travel tools based on where you are going.
            </p>
            <div className="landing-actions">
              <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
                Start Free
              </button>
              <button type="button" className="landing-secondary-cta" onClick={onOpenApp}>
                Open Web App
              </button>
            </div>
            <div className="landing-trust-line">
              Built for global travelers, sports fans, and major events.
            </div>
          </div>

          <div className="landing-visual" aria-label="FanAtlas app preview">
            <div className="landing-orbit landing-orbit-one" />
            <div className="landing-orbit landing-orbit-two" />
            <div className="landing-phone-shell">
              <div className="landing-phone-status">
                <span>Traveling to</span>
                <strong>🇪🇬 Cairo, Egypt</strong>
              </div>
              <div className="landing-map-preview">
                <Navigation size={34} />
                <span className="landing-map-pin pin-one" />
                <span className="landing-map-pin pin-two" />
                <span className="landing-map-pin pin-three" />
              </div>
              <div className="landing-phone-grid">
                {heroScreens.map((screen) => (
                  <div key={screen.name}>
                    <span>{screen.name}</span>
                    <strong>{screen.value}</strong>
                  </div>
                ))}
              </div>
            </div>
            {heroScreens.slice(1, 4).map((screen, index) => (
              <div className={`landing-floating-card float-${index + 1}`} key={screen.name}>
                <span>{screen.name}</span>
                <strong>{screen.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>App preview</span>
            <h2>Everything you need when you land.</h2>
          </div>
          <div className="landing-preview-grid">
            {previewCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="landing-glass-card" key={card.title}>
                  <Icon size={24} />
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-location-section">
          <div>
            <span className="landing-section-pill">Location-aware</span>
            <h2>Your app changes when your trip changes.</h2>
            <p>
              Choose where you are traveling, and FanAtlas adapts hotels, restaurants, SOS, maps,
              currency, language tools, and travel recommendations for that destination.
            </p>
          </div>
          <div className="landing-trip-card">
            <div><span>From</span><strong>🇬🇧 United Kingdom</strong></div>
            <div><span>Traveling to</span><strong>🇪🇬 Egypt</strong></div>
            <div><span>City</span><strong>Cairo</strong></div>
          </div>
        </section>

        <section className="landing-event-section">
          <span>Past Event Archive</span>
          <h2>World Cup 2026 Archive</h2>
          <p>Browse completed tournament guides, stadium visits, fan zones, hotels, restaurants, and sports-travel history.</p>
          <button type="button" className="landing-secondary-cta" onClick={onExploreEventMode}>
            Explore Past Event Guides
          </button>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>How it works</span>
            <h2>Plan from arrival to action in minutes.</h2>
          </div>
          <div className="landing-steps">
            <article><strong>1</strong><span>Choose your destination</span></article>
            <article><strong>2</strong><span>Discover nearby travel essentials</span></article>
            <article><strong>3</strong><span>Save, plan, and navigate your trip</span></article>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Features</span>
            <h2>A complete toolkit for every kind of traveler.</h2>
          </div>
          <div className="landing-features-grid">
            {featureGrid.map((feature) => {
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

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Screens</span>
            <h2>Designed for the moments travelers actually need help.</h2>
          </div>
          <div className="landing-screenshot-grid">
            {mockups.map((screen) => (
              <article className="landing-screen-card" key={screen.title}>
                <div className="landing-screen-top">
                  <span>{screen.title}</span>
                  <strong>{screen.detail}</strong>
                </div>
                <div className="landing-screen-list">
                  {screen.items.map((item) => <span key={item}>{item}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-final-cta">
          <span>Ready for your next destination?</span>
          <h2>Start planning your next trip with FanAtlas.</h2>
          <div className="landing-actions">
            <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
              Start Free
            </button>
            <button type="button" className="landing-secondary-cta" onClick={onOpenApp}>
              Open Web App
            </button>
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
