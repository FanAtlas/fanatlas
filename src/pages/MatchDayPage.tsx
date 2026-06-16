import { useState } from "react";
import { FanAtlasMatch } from "../services/worldcup2026";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, MapDestination } from "../mapDestinations";

type Props = {
  match: FanAtlasMatch | null;
  setMapDestination: (destination: MapDestination | null) => void;
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

export function MatchDayPage({ match, setMapDestination, setTab }: Props) {
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
  const checklist = [
    "Passport or government ID",
    "Match ticket saved offline",
    "Phone battery above 80%",
    "Clear or small bag only",
    "Water before leaving",
    "Hotel address saved"
  ];
  const [checked, setChecked] = useState<string[]>([]);

  const timeline = [
    { time: "T-4h", title: "Confirm essentials", detail: "Ticket, ID, phone battery, bag policy, and return route." },
    { time: "T-3h", title: "Leave early", detail: "Use official transport first and avoid unknown shortcuts." },
    { time: "T-2h", title: "Eat before entry", detail: "Grab food nearby before stadium lines build up." },
    { time: "T-90m", title: "Enter stadium zone", detail: "Expect screening, crowds, and walking time to your gate." },
    { time: "Post", title: "Exit plan", detail: `Use groups and consider ${m.fanZone} only if crowds are manageable.` }
  ];

  function openStadiumMap() {
    setMapDestination(getStadiumDestination(m.stadium, m.city) || null);
    setTab("map");
  }

  function openFanZones() {
    setMapDestination(getFanZoneDestination(m.fanZone) || null);
    setTab("explore");
  }

  function toggleChecklist(item: string) {
    setChecked((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item]
    );
  }

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
        <div className="matchday-label">Match Day Plan</div>
        <div className="matchday-teams">{m.team1} vs {m.team2}</div>
        <p>{m.date} · {m.time}</p>
        <p>🏟 {m.stadium} · {m.city}</p>
        <div className="matchday-progress">
          <span>{checked.length}/{checklist.length} ready</span>
          <div>
            <i style={{ width: `${(checked.length / checklist.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <h3>Timeline</h3>
      <div className="timeline-list">
        {timeline.map((item) => (
          <div className="timeline-item" key={item.time}>
            <span>{item.time}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
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
          <button onClick={openStadiumMap}>Open in-app map</button>
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
          <button onClick={openFanZones}>View fan zones</button>
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
      {checklist.map((item) => (
        <button
          className={`checklist-row ${checked.includes(item) ? "active" : ""}`}
          key={item}
          onClick={() => toggleChecklist(item)}
        >
          <span>{checked.includes(item) ? "✓" : "□"}</span>
          <p>{item}</p>
        </button>
      ))}

      <button className="feature-card blue" onClick={() => setTab("ai")}>
        <span className="feature-emoji">🤖</span>
        <div>
          <h3>Ask AI about this match</h3>
          <p>Get a personalized food, route, fan zone, and safety plan.</p>
        </div>
      </button>
    </>
  );
}
