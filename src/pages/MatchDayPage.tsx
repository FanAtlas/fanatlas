import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { FanAtlasMatch } from "../services/worldcup2026";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, MapDestination } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { fanZones, places } from "../data/mockData";
import { emptyWeather, FanAtlasWeather, formatWeatherValue, getWeather } from "../services/weather";

type Props = {
  match: FanAtlasMatch | null;
  onBack: () => void;
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

function cityKey(city: string) {
  const normalized = city.toLowerCase();
  if (normalized.includes("new york") || normalized.includes("jersey")) return "New York";
  if (normalized.includes("los angeles")) return "Los Angeles";
  if (normalized.includes("mexico")) return "Mexico City";
  if (normalized.includes("toronto")) return "Toronto";
  if (normalized.includes("vancouver")) return "Vancouver";
  if (normalized.includes("dallas") || normalized.includes("arlington")) return "Dallas";
  if (normalized.includes("san francisco")) return "San Francisco";
  if (normalized.includes("miami")) return "Miami";
  return city.split("/")[0].trim();
}

function kickoffDate(match: FanAtlasMatch) {
  const date = match.kickoffUtc ? new Date(match.kickoffUtc) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function timeBefore(date: Date | null, hours: number) {
  if (!date) return "2-3 hours before kickoff";
  return new Date(date.getTime() - hours * 60 * 60 * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function transportationFor(city: string) {
  const normalized = city.toLowerCase();
  if (normalized.includes("new york") || normalized.includes("jersey")) return ["NJ Transit or official shuttle", "Avoid unlicensed taxis", "Walk away from stadium exits before rideshare"];
  if (normalized.includes("mexico")) return ["Metro plus official transfer", "Hotel-arranged taxi", "Verified rideshare pickup"];
  if (normalized.includes("los angeles")) return ["Official shuttle", "Metro/rideshare combo", "Pre-book return pickup away from SoFi"];
  if (normalized.includes("toronto")) return ["TTC", "GO Transit", "Downtown walking route"];
  if (normalized.includes("vancouver")) return ["SkyTrain", "Downtown walk", "Taxi after crowd release"];
  return ["Official stadium transport", "Hotel shuttle", "Verified rideshare"];
}

function nearbyHotels(city: string, stadium: string) {
  const key = cityKey(city);
  if (stadium.includes("MetLife")) return ["Marriott Times Square", "Moxy Chelsea", "Meadowlands hotel shuttle area"];
  if (stadium.includes("Azteca")) return ["Ibis Mexico City", "Galeria Plaza Reforma", "Coyoacan hotel area"];
  if (stadium.includes("SoFi")) return ["Holiday Inn Los Angeles", "Cambria LAX", "Inglewood airport hotels"];
  if (city.toLowerCase().includes("toronto")) return ["Delta Hotels Toronto", "Downtown Toronto hotels", "Liberty Village stays"];
  return [`${key} central hotel`, `${key} stadium hotel search`, "Official hotel partner area"];
}

export function MatchDayPage({ match, onBack, setMapDestination, setTab }: Props) {
  if (!match) {
    return (
      <>
        <div className="topbar">
          <BackButton onBack={onBack} />
          <div>
            <div className="brand">Match Day <span>Assistant</span></div>
            <div className="subtle">Choose a match to build your plan</div>
          </div>
        </div>

        <div className="matchday-hero">
          <div className="matchday-label">Match Day Plan</div>
          <div className="matchday-teams">Select a World Cup match</div>
          <p>Open the schedule, search or filter the 104 fixtures, then tap Plan Match Day.</p>
          <button className="secondary-btn full-width" onClick={() => setTab("matches")}>
            View match schedule
          </button>
        </div>
      </>
    );
  }

  const m = match;

  const tips = citySafetyTips(m.city);
  const kickoff = kickoffDate(m);
  const [weather, setWeather] = useState<FanAtlasWeather>(() => emptyWeather());
  const [weatherError, setWeatherError] = useState("");
  const recommendedArrival = timeBefore(kickoff, 2.5);
  const city = cityKey(m.city);
  const restaurants = places
    .filter((place) => m.city.toLowerCase().includes(place.city.toLowerCase()) || place.city.toLowerCase().includes(city.toLowerCase()))
    .slice(0, 3);
  const restaurantList = restaurants.length ? restaurants : places.slice(0, 3);
  const hotels = nearbyHotels(m.city, m.stadium);
  const zoneList = [
    ...fanZones.filter((zone) => m.city.toLowerCase().includes(zone.city.toLowerCase()) || zone.name === m.fanZone),
    ...fanZones
  ].filter((zone, index, list) => list.findIndex((item) => item.name === zone.name) === index).slice(0, 3);
  const transport = transportationFor(m.city);
  const checklist = [
    "Passport or government ID",
    "Match ticket saved offline",
    "Phone battery above 80%",
    "Clear or small bag only",
    "Water before leaving",
    "Hotel address saved"
  ];
  const [checked, setChecked] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    const destination = getStadiumDestination(m.stadium, m.city);
    if (!destination) return;

    getWeather(destination.lat, destination.lng)
      .then((result) => {
        setWeather(result);
        setWeatherError("");
      })
      .catch((error) => {
        console.error("Match day weather error:", error);
        setWeather(emptyWeather());
        setWeatherError("Weather unavailable. Review conditions again before departure.");
      });
  }, [m.city, m.stadium]);

  const timeline = [
    { time: "08:00", title: "Leave Hotel", detail: `Confirm ticket, ID, phone battery, and route to ${city}.` },
    { time: "09:00", title: "Fan Zone", detail: `Start at ${zoneList[0]?.name || m.fanZone} while crowds are still manageable.` },
    { time: "12:00", title: "Stadium", detail: `Arrive near ${m.stadium}, eat, hydrate, and clear security early.` },
    { time: "15:00", title: "Match", detail: `${m.team1} vs ${m.team2}. Keep return route and meeting point ready.` },
    { time: "18:00", title: "Post Match Fan Zone", detail: `Use groups and consider ${m.fanZone} if crowd levels feel safe.` }
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

  async function addMatchReminder() {
    const kickoff = m.kickoffUtc ? new Date(m.kickoffUtc).getTime() : NaN;
    const dueAt = Number.isNaN(kickoff)
      ? reminderDate(120)
      : new Date(Math.max(Date.now() + 60000, kickoff - 2 * 60 * 60 * 1000)).toISOString();

    const { permission } = await scheduleNotification({
      type: "match",
      title: `${m.team1} vs ${m.team2}`,
      message: `Match reminder for ${m.stadium}, ${m.city}. Check ticket, route, ID, and arrival plan.`,
      dueAt,
      source: "Match Day",
      actionTab: "matchday"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Match reminder saved in FanAtlas. Browser notifications are blocked."
        : "Match reminder saved."
    );
  }

  return (
    <>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Match Day <span>Assistant</span></div>
          <div className="subtle">{m.team1} vs {m.team2}</div>
        </div>
      </div>

      <div className="matchday-hero">
        <div className="matchday-label">Match Day Plan</div>
        <div className="matchday-teams">{m.team1} vs {m.team2}</div>
        <p>{m.date} · {m.time}</p>
        <p>🏟 {m.stadium} · {m.city}</p>
        <div className="matchday-summary-grid">
          <div>
            <span>Kickoff</span>
            <strong>{m.time}</strong>
          </div>
          <div>
            <span>Weather</span>
            <strong>{formatWeatherValue(weather.temperature, "°C")}</strong>
          </div>
          <div>
            <span>Arrive By</span>
            <strong>{recommendedArrival}</strong>
          </div>
        </div>
        <button className="secondary-btn full-width" onClick={addMatchReminder}>
          ⏰ Add match reminder
        </button>
        {notificationMessage && <div className="route-status">{notificationMessage}</div>}
        <div className="matchday-progress">
          <span>{checked.length}/{checklist.length} ready</span>
          <div>
            <i style={{ width: `${(checked.length / checklist.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <h3>Personalized Itinerary</h3>
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

      <div className="matchday-planner-grid">
        <section className="planner-panel">
          <h3>Weather</h3>
          <div className="weather-metrics compact">
            <span>Temp <strong>{formatWeatherValue(weather.temperature, "°C")}</strong></span>
            <span>Rain <strong>{formatWeatherValue(weather.rainProbability, "%")}</strong></span>
            <span>Wind <strong>{formatWeatherValue(weather.windSpeed, " km/h")}</strong></span>
          </div>
          <p>{weatherError || weather.recommendation}</p>
        </section>

        <section className="planner-panel">
          <h3>Recommended Arrival</h3>
          <strong>{recommendedArrival}</strong>
          <p>Plan to be near the stadium about 2-3 hours before kickoff.</p>
        </section>
      </div>

      <section className="planner-panel">
        <h3>Nearby Restaurants</h3>
        {restaurantList.map((restaurant) => (
          <div className="planner-row" key={restaurant.name}>
            <span>🍽</span>
            <div>
              <strong>{restaurant.name}</strong>
              <p>{restaurant.city} · ⭐ {restaurant.rating} · {restaurant.distance}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="planner-panel">
        <h3>Nearby Hotels</h3>
        {hotels.map((hotel) => (
          <div className="planner-row" key={hotel}>
            <span>🏨</span>
            <div>
              <strong>{hotel}</strong>
              <p>Save address offline and confirm post-match route.</p>
            </div>
          </div>
        ))}
      </section>

      <section className="planner-panel">
        <h3>Nearby Fan Zones</h3>
        {zoneList.map((zone) => (
          <div className="planner-row" key={zone.name}>
            <span>🎉</span>
            <div>
              <strong>{zone.name}</strong>
              <p>{zone.city} · {zone.hours} · {zone.entry}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="planner-panel">
        <h3>Transportation</h3>
        {transport.map((item) => (
          <div className="planner-row" key={item}>
            <span>🚆</span>
            <div>
              <strong>{item}</strong>
              <p>Use the in-app map before leaving and again after the match.</p>
            </div>
          </div>
        ))}
      </section>

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
