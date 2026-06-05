import { emergencyServices } from "../data/mockData";
export function SOSPage() {
  const phrases = [["English","I need help. Call an ambulance. Where is the hospital?"],["Spanish","Necesito ayuda. Llame una ambulancia. ¿Dónde está el hospital?"],["French","J’ai besoin d’aide. Appelez une ambulance. Où est l’hôpital ?"],["Arabic","أحتاج إلى مساعدة. اتصل بالإسعاف. أين المستشفى؟"]];
  return (
    <>
      <div className="topbar"><div className="brand">FanAtlas <span>2026</span></div><div className="language-pill">🌐 English</div></div>
      <a href="tel:911" className="sos-hero"><span>⚠️</span><h2>SOS Emergency</h2><p>Press to call 911</p></a>
      <div className="card-dark"><h3>Emergency Numbers</h3><div className="emergency-row">🇺🇸 USA <a href="tel:911">☎ 911</a></div><div className="emergency-row">🇨🇦 Canada <a href="tel:911">☎ 911</a></div><div className="emergency-row">🇲🇽 Mexico <a href="tel:911">☎ 911</a></div></div>
      <h3>Find Nearby</h3>{["Nearest Hospitals","Police Stations","Consulates & Embassies"].map(x=><div className="list-card" key={x}><strong>{x}</strong><span>›</span></div>)}
      <h3>Emergency Services</h3>{emergencyServices.map(s=><div className="list-card" key={s.name}><div><strong>{s.name}</strong><p>{s.category} · {s.city}</p></div><a className="mini-btn" href={`tel:${s.phone}`}>{s.phone}</a></div>)}
      <h3>Emergency Translation</h3>{phrases.map(([l,t])=><div className="card-dark" key={l}><strong>{l}</strong><p>{t}</p></div>)}
    </>
  );
}
