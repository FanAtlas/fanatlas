import { BackButton } from "../components/BackButton";

export function TermsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="legal-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">FanAtlas <span>Terms</span></div>
      </div>

      <section className="legal-hero">
        <span>Terms of Service</span>
        <h1>Use FanAtlas as a travel planning companion.</h1>
        <p>FanAtlas helps travelers discover places, plan routes, review travel tools, and prepare for events. It does not replace official event, government, medical, legal, or emergency instructions.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Travel Information</h3>
        <p>Schedules, routes, prices, availability, weather, and local guidance can change. Always verify critical travel details with official providers.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Emergency Use</h3>
        <p>For emergencies, call local emergency services. In the USA, Canada, and Mexico, call 911.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>External Services</h3>
        <p>Some buttons open third-party travel, shopping, connectivity, or transportation services. Review details directly with the provider before purchasing or booking.</p>
      </section>

      <section className="card-dark legal-section">
        <h3>Account Responsibility</h3>
        <p>You are responsible for keeping your login details secure and for using FanAtlas lawfully while traveling.</p>
      </section>
    </div>
  );
}
