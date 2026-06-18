import { useEffect, useMemo, useState } from "react";
import { worldCup2026Teams } from "../data/onboardingOptions";

type SupporterGroup = {
  id: string;
  team: string;
  name: string;
  city: string;
  members: number;
  description: string;
};

type FanGathering = {
  id: string;
  team: string;
  title: string;
  city: string;
  venue: string;
  time: string;
  crowd: string;
};

type MeetupPoint = {
  id: string;
  city: string;
  name: string;
  address: string;
  bestFor: string;
};

const STORAGE_KEY = "fanatlas.joinedMeetups";

const supporterGroups: SupporterGroup[] = [
  { id: "morocco-nyc", team: "Morocco", name: "Atlas Lions NYC", city: "New York/New Jersey", members: 1240, description: "North African supporters meeting near transit-friendly fan zones." },
  { id: "usa-la", team: "United States", name: "Stars & Stripes LA", city: "Los Angeles", members: 2180, description: "US supporters coordinating SoFi Stadium and beach-area gatherings." },
  { id: "mexico-cdmx", team: "Mexico", name: "El Tri Capital", city: "Mexico City", members: 3400, description: "Mexico fans focused on Azteca match days and family-friendly fan parks." },
  { id: "canada-toronto", team: "Canada", name: "Red Wall Toronto", city: "Toronto", members: 1540, description: "Canada supporters meeting around downtown and BMO Field routes." },
  { id: "brazil-miami", team: "Brazil", name: "Canarinho Miami", city: "Miami", members: 1890, description: "Brazil fans planning music-forward beach and stadium day meetups." },
  { id: "argentina-dallas", team: "Argentina", name: "Albiceleste Dallas", city: "Dallas", members: 1760, description: "Argentina supporters coordinating BBQ, chants, and stadium travel." },
  { id: "france-vancouver", team: "France", name: "Les Bleus Vancouver", city: "Vancouver", members: 920, description: "French supporters sharing downtown meetup points before matches." },
  { id: "portugal-bay", team: "Portugal", name: "Portugal Bay Area", city: "San Francisco Bay Area", members: 870, description: "Portugal fans meeting near transit routes to Levi's Stadium." }
];

const gatherings: FanGathering[] = [
  { id: "morocco-times-square", team: "Morocco", title: "Pre-match scarf walk", city: "New York/New Jersey", venue: "Times Square Fan Park", time: "Match day · 4 hours before kickoff", crowd: "High" },
  { id: "usa-santa-monica", team: "United States", title: "Beach supporters breakfast", city: "Los Angeles", venue: "Santa Monica fan screens", time: "Match day · Morning", crowd: "Medium" },
  { id: "mexico-zocalo", team: "Mexico", title: "Zocalo watch party", city: "Mexico City", venue: "Centro Historico", time: "Match day · 3 hours before kickoff", crowd: "Very High" },
  { id: "canada-waterfront", team: "Canada", title: "Waterfront march", city: "Toronto", venue: "Toronto Fan Experience", time: "Match day · 2 hours before kickoff", crowd: "High" },
  { id: "brazil-wynwood", team: "Brazil", title: "Samba fan gathering", city: "Miami", venue: "Wynwood watch parties", time: "Evening before match", crowd: "High" },
  { id: "argentina-power-light", team: "Argentina", title: "Supporter songs night", city: "Dallas", venue: "Arlington Fan Fest", time: "Evening before match", crowd: "Medium" },
  { id: "all-seattle-center", team: "All Teams", title: "Neutral fan swap meetup", city: "Seattle", venue: "Seattle Center Fan Fest", time: "Daily · 5pm", crowd: "Medium" }
];

const meetupPoints: MeetupPoint[] = [
  { id: "nyc-times-square", city: "New York/New Jersey", name: "Times Square Fan Park", address: "Times Square, Manhattan", bestFor: "Large groups and public screens" },
  { id: "la-sofi-village", city: "Los Angeles", name: "SoFi Fan Village", address: "Hollywood Park, Inglewood", bestFor: "Stadium-day supporter groups" },
  { id: "cdmx-zocalo", city: "Mexico City", name: "Zocalo Fan Area", address: "Centro Historico", bestFor: "Mexico and visiting supporters" },
  { id: "toronto-waterfront", city: "Toronto", name: "Toronto Fan Experience", address: "Waterfront / Exhibition Place area", bestFor: "Canada fans and family gatherings" },
  { id: "miami-bayfront", city: "Miami", name: "Bayfront Fan Fest", address: "Bayfront Park", bestFor: "Beach-city watch parties" },
  { id: "vancouver-downtown", city: "Vancouver", name: "Downtown Vancouver Fan Zone", address: "Downtown Vancouver", bestFor: "Transit-friendly meetups" }
];

function readJoinedGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function MeetupPage() {
  const [favoriteTeam, setFavoriteTeam] = useState("Morocco");
  const [joinedGroups, setJoinedGroups] = useState<string[]>(() => readJoinedGroups());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedGroups));
  }, [joinedGroups]);

  const visibleGroups = useMemo(() => {
    const exact = supporterGroups.filter((group) => group.team === favoriteTeam);
    return exact.length ? exact : supporterGroups.slice(0, 4);
  }, [favoriteTeam]);

  const visibleGatherings = useMemo(() => (
    gatherings.filter((event) => event.team === favoriteTeam || event.team === "All Teams")
  ), [favoriteTeam]);

  function toggleJoin(id: string) {
    setJoinedGroups((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ));
  }

  return (
    <div className="meetup-page">
      <div className="topbar">
        <div>
          <div className="brand">Fan <span>Meetups</span></div>
          <div className="subtle">Supporter groups and public meetup points</div>
        </div>
      </div>

      <section className="meetup-hero">
        <span>No chat yet</span>
        <h1>Find fans before kickoff.</h1>
        <p>Select your team, join supporter groups, and discover public gathering points in host cities.</p>
      </section>

      <label className="meetup-team-picker">
        <span>Favorite Team</span>
        <select className="input" value={favoriteTeam} onChange={(event) => setFavoriteTeam(event.target.value)}>
          {worldCup2026Teams.map((team) => <option key={team}>{team}</option>)}
        </select>
      </label>

      <section>
        <div className="section-row">
          <h3>Supporter Groups</h3>
          <span className="subtle">{joinedGroups.length} joined</span>
        </div>

        <div className="meetup-card-list">
          {visibleGroups.map((group) => {
            const joined = joinedGroups.includes(group.id);
            return (
              <article className="meetup-card" key={group.id}>
                <div>
                  <span>{group.team} · {group.city}</span>
                  <strong>{group.name}</strong>
                  <p>{group.description}</p>
                  <small>{group.members.toLocaleString()} supporters</small>
                </div>
                <button className={joined ? "secondary-btn" : "primary-btn"} onClick={() => toggleJoin(group.id)}>
                  {joined ? "Joined" : "Join"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3>Fan Gatherings</h3>
        <div className="meetup-card-list">
          {visibleGatherings.map((event) => (
            <article className="meetup-gathering" key={event.id}>
              <div>
                <span>{event.city}</span>
                <strong>{event.title}</strong>
                <p>{event.venue} · {event.time}</p>
              </div>
              <em>{event.crowd}</em>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3>Public Meetup Points</h3>
        <div className="meetup-point-grid">
          {meetupPoints.map((point) => (
            <article className="meetup-point" key={point.id}>
              <span>{point.city}</span>
              <strong>{point.name}</strong>
              <p>{point.address}</p>
              <small>{point.bestFor}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
