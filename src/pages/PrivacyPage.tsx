import { BackButton } from "../components/BackButton";

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="legal-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">FanAtlas <span>Legal</span></div>
      </div>

      <section className="legal-hero">
        <span>Privacy Policy</span>
        <h1>Your travel data stays focused on your trip.</h1>
        <p>FanAtlas uses account, profile, location, and travel planning data to power app features like maps, match planning, favorites, safety, and support.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Information We Use</h3>
        <p>We may use your email, preferred language, saved favorites, selected teams, travel interests, and app activity to personalize FanAtlas.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Location Data</h3>
        <p>Location is used only when you allow it, such as for nearby hospitals, restaurants, hotels, routes, fan zones, and emergency guidance.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Third-Party Services</h3>
        <p>FanAtlas may connect to services for authentication, maps, exchange rates, weather, AI assistance, booking links, and analytics. Those providers may process data under their own policies.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Contact</h3>
        <p>For privacy questions, contact kadsimohamedads@gmail.com.</p>
      </section>
    </div>
  );
}
