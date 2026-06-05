import { emergencyServices } from "../data/mockData";

export function SOSPage() {
  const phrases = [
    ["English", "I need help. Call an ambulance. Where is the hospital?"],
    ["Spanish", "Necesito ayuda. Llame una ambulancia. ¿Dónde está el hospital?"],
    ["French", "J’ai besoin d’aide. Appelez une ambulance. Où est l’hôpital ?"],
    ["Arabic", "أحتاج إلى مساعدة. اتصل بالإسعاف. أين المستشفى؟"]
  ];

  return (
    <>
      <div className="header">
        <div>
          <div className="logo">SOS</div>
          <div className="subtle">Emergency help for tourists</div>
        </div>
      </div>

      <div className="card red">
        <p className="title">Emergency Call</p>
        <p className="subtle">USA, Canada, and Mexico use 911 for emergency services.</p>
        <a href="tel:911"><button className="primary-btn">Call 911</button></a>
      </div>

      <h3>Emergency Services</h3>
      {emergencyServices.map((s) => (
        <div className="card" key={`${s.name}-${s.city}`}>
          <p className="small-title">{s.name}</p>
          <p className="subtle">{s.category} · {s.city}</p>
          <p className="subtle">{s.address}</p>
          <a href={`tel:${s.phone}`}><button className="secondary-btn">Call {s.phone}</button></a>
        </div>
      ))}

      <h3>Emergency Translation</h3>
      {phrases.map(([lang, text]) => (
        <div className="card" key={lang}>
          <p className="small-title">{lang}</p>
          <p className="subtle">{text}</p>
        </div>
      ))}
    </>
  );
}
