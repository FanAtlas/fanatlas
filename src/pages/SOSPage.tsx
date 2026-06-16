import { emergencyServices } from "../data/mockData";
import { languages } from "../i18n";
import { useLanguage } from "../LanguageContext";

export function SOSPage() {
  const { language } = useLanguage();
  const emergencyNumbers = [
    { country: "USA", flag: "🇺🇸", phone: "911", note: "Police, fire, ambulance" },
    { country: "Canada", flag: "🇨🇦", phone: "911", note: "Police, fire, ambulance" },
    { country: "Mexico", flag: "🇲🇽", phone: "911", note: "National emergency line" }
  ];
  const consulates = [
    { name: "Embassy / Consulate Help", city: "All host cities", phone: "+1 202-501-4444", note: "US emergency assistance abroad" },
    { name: "Canadian Consular Emergency", city: "USA / Mexico", phone: "+1 613-996-8885", note: "Canada emergency watch office" },
    { name: "Mexico Tourism Assistance", city: "Mexico", phone: "078", note: "Tourist support and local guidance" }
  ];
  const phrases = [
    ["English","I need help. Call an ambulance. Where is the hospital?"],
    ["Spanish","Necesito ayuda. Llame una ambulancia. ¿Dónde está el hospital?"],
    ["French","J’ai besoin d’aide. Appelez une ambulance. Où est l’hôpital ?"],
    ["Arabic","أحتاج إلى مساعدة. اتصل بالإسعاف. أين المستشفى؟"],
    ["Portuguese","Preciso de ajuda. Chame uma ambulância. Onde fica o hospital?"]
  ];

  return (
    <>
      <div className="topbar"><div className="brand">FanAtlas <span>2026</span></div><div className="language-pill">{languages[language]}</div></div>
      <a href="tel:911" className="sos-hero"><span>⚠️</span><h2>SOS Emergency</h2><p>Tap to call local emergency services</p></a>

      <h3>Emergency Numbers</h3>
      <div className="sos-grid">
        {emergencyNumbers.map((item) => (
          <a className="sos-tile" href={`tel:${item.phone}`} key={item.country}>
            <strong>{item.flag} {item.country}</strong>
            <span>{item.phone}</span>
            <p>{item.note}</p>
          </a>
        ))}
      </div>

      <h3>Hospitals</h3>
      {emergencyServices
        .filter((service) => service.category.toLowerCase().includes("hospital"))
        .map((service) => (
          <div className="list-card" key={service.name}>
            <div>
              <strong>{service.name}</strong>
              <p>{service.city} · {service.address}</p>
            </div>
            <a className="mini-btn" href={`tel:${service.phone}`}>{service.phone}</a>
          </div>
        ))}

      <h3>Consulates & Assistance</h3>
      {consulates.map((service) => (
        <div className="list-card" key={service.name}>
          <div>
            <strong>{service.name}</strong>
            <p>{service.city} · {service.note}</p>
          </div>
          <a className="mini-btn" href={`tel:${service.phone}`}>{service.phone}</a>
        </div>
      ))}

      <h3>Emergency Translation</h3>
      {phrases.map(([l,t])=><div className="card-dark" key={l}><strong>{l}</strong><p>{t}</p></div>)}
    </>
  );
}
