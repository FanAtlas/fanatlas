import { Mail } from "lucide-react";
import { BackButton } from "../components/BackButton";

export function SupportPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="legal-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">FanAtlas <span>Support</span></div>
      </div>

      <section className="legal-hero">
        <span>Support</span>
        <h1>Need help with FanAtlas?</h1>
        <p>Contact support for account help, app issues, travel feature questions, or partner inquiries.</p>
      </section>

      <section className="card-dark support-contact-card">
        <Mail size={22} />
        <div>
          <strong>Email</strong>
          <a href="mailto:kadsimohamedads@gmail.com">kadsimohamedads@gmail.com</a>
        </div>
      </section>

      <section className="card-dark legal-section">
        <h3>Emergency Notice</h3>
        <p>FanAtlas support is not an emergency service. For urgent help in the USA, Canada, or Mexico, call 911.</p>
      </section>
    </div>
  );
}
