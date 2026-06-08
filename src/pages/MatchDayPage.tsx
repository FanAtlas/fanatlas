import { FanAtlasMatch } from "../services/worldcup2026";
import { Tab } from "../main";

type Props = {
  match: FanAtlasMatch | null;
  setTab: (tab: Tab) => void;
};

function citySafetyTips(city: string) {
  const c = city.toLowerCase();

  if (c.includes("mexico") || c.includes("guadalajara") || c.includes("monterrey")) {
    return [
      "Use official taxis, rideshare, or hotel-arranged transportation.",
      "Stay hydrated and avoid heavy alcohol on arrival day.",
      "Keep your passport secured at your hotel unless needed."
    ];
  }

  if (c.includes("los angeles")) {
    return [
      "Expect heavy traffic around SoFi Stadium.",
      "Use official rideshare zones after the match.",
      "Leave extra time if traveling from Hollywood, Downtown LA, or Santa Monica."
    ];
  }

  if (c.includes("new york") || c.includes("jersey")) {
    return [
      "Use train and official shuttle routes when available.",
      "Avoid unlicensed taxis after the match.",
      "Expect heavy crowds at transit stations."
    ];
  }

  if (c.includes("toronto") || c.includes("vancouver")) {
    return [
      "Use public transit when possible.",
      "Check weather before leaving because conditions can change quickly.",
      "Keep your phone charged for transit and hotel directions."
    ];
  }

  return [
    "Arrive early and use official stadium transportation.",
    "Avoid buying tickets from strangers outside the stadium.",
    "Plan your return route before kickoff."
  ];
}

export function MatchDayPage({ match, setTab }: Props) {
  const m =
    match ||
    ({
      team1: "Mexico",
      team2: "South Africa",
      stadium: "Estadio Azteca",
      city: "Mexico City",
      date: "Jun 11, 2026",
      time: "13:00",
      status: "Scheduled",
      fanZone: "Azteca Fan Fest"
    } as FanAtlasMatch);

  const tips = citySafetyTips(m.city);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Match Day <span>Assistant</span></div>
          <div className="subtle">{m.team1} vs {m.team2}</div>
        </div>
        <button className="small-dark-btn" onClick={() => setTab("matches")}>← Back</button>
      </div>

      <div className="matchday-hero">
        <div className="matchday-teams">{m.team1} vs {m.team2}</div>
        <p>{m.date} · {m.time}</p>
        <p>🏟 {m.stadium} · {m.city}</p>
      </div>

      <div className="assistant-grid">
        <div className="assistant-card">
          <span>⏰</span>
          <strong>Best Arrival</strong>
          <p>Arrive 2–3 hours before kickoff. Leave earlier if staying far from the stadium.</p>
        </div>

        <div className="assistant-card">
          <span>🧭</span>
          <strong>Route Plan</strong>
          <p>Use official transport first. Avoid unknown shortcuts after the match.</p>
          <button onClick={() => setTab("map")}>Open in-app map</button>
        </div>

        <div className="assistant-card">
          <span>🍽️</span>
          <strong>Food Nearby</strong>
          <p>Eat before entering the stadium area to avoid long lines and high prices.</p>
          <button onClick={() => setTab("explore")}>Find food</button>
        </div>

        <div className="assistant-card">
          <span>🎉</span>
          <strong>After Match</strong>
          <p>Recommended fan zone: {m.fanZone}. Travel with groups after dark.</p>
          <button onClick={() => setTab("explore")}>View fan zones</button>
        </div>
      </div>

      <h3>⚠ Safety Tips</h3>
      {tips.map((tip) => (
        <div className="safety-tip" key={tip}>
          <span>✓</span>
          <p>{tip}</p>
        </div>
      ))}

      <h3>🎒 Stadium Checklist</h3>
      {[
        "Passport or government ID",
        "Match ticket saved offline",
        "Phone battery above 80%",
        "Clear/small bag only",
        "Water before leaving",
        "Hotel address saved"
      ].map((item) => (
        <div className="checklist-row" key={item}>
          <span>□</span>
          <p>{item}</p>
        </div>
      ))}

      <div className="feature-card blue">
        <span className="feature-emoji">🤖</span>
        <div>
          <h3>Ask AI next</h3>
          <p>Next version will send this match into the AI chat automatically.</p>
        </div>
      </div>
    </>
  );
}
