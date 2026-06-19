import { useEffect, useMemo, useState } from "react";
import { Tab } from "../main";
import {
  defaultMapDestinations,
  fanZoneDestinations,
  getStadiumDestination,
  MapDestination,
  stadiumDestinations
} from "../mapDestinations";
import { FanAtlasMatch, FanAtlasStadium, getWorldCup2026Games, getWorldCup2026Stadiums } from "../services/worldcup2026";
import { FavoriteButton } from "../components/FavoriteButton";
import { BackButton } from "../components/BackButton";
import { emptyWeather, FanAtlasWeather, formatWeatherValue, getWeather } from "../services/weather";

type Props = {
  onBack: () => void;
  stadium: MapDestination | null;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
};

const stadiumImages: Record<string, string> = {
  "MetLife Stadium": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
  "Estadio Azteca": "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?auto=format&fit=crop&w=1200&q=80",
  "SoFi Stadium": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
  "BMO Field": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
  "AT&T Stadium": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1200&q=80",
  "BC Place": "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=1200&q=80",
  "Lumen Field": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
  "Levi's Stadium": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
  "Rose Bowl": "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
  "NRG Stadium": "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80",
  "Mercedes-Benz Stadium": "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80",
  "Hard Rock Stadium": "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
  "Arrowhead Stadium": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
  "Lincoln Financial Field": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
  "Gillette Stadium": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
  "Estadio Akron": "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?auto=format&fit=crop&w=1200&q=80",
  "Estadio BBVA": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1200&q=80"
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cityKey(city: string) {
  const normalized = normalize(city);
  if (normalized.includes("new york") || normalized.includes("jersey")) return "New York";
  if (normalized.includes("los angeles")) return "Los Angeles";
  if (normalized.includes("mexico")) return "Mexico City";
  if (normalized.includes("san francisco")) return "San Francisco";
  if (normalized.includes("dallas") || normalized.includes("arlington")) return "Dallas";
  if (normalized.includes("kansas")) return "Kansas City";
  return city.split("/")[0].trim();
}

function transportationFor(stadium: MapDestination) {
  const city = normalize(stadium.city);

  if (city.includes("new york") || city.includes("jersey")) return ["NJ Transit train to Meadowlands", "Official shuttle zones", "Rideshare pickup after crowd release"];
  if (city.includes("mexico")) return ["Metro plus official stadium transfer", "Hotel-arranged taxi", "Rideshare with verified pickup"];
  if (city.includes("los angeles")) return ["Official stadium shuttles", "Metro + rideshare staging", "Pre-booked hotel transfer"];
  if (city.includes("toronto")) return ["TTC streetcar/subway connections", "GO Transit", "Walk from downtown fan areas where safe"];
  if (city.includes("vancouver")) return ["SkyTrain to Stadium-Chinatown", "Downtown walking routes", "Taxi or rideshare after match"];
  if (city.includes("seattle")) return ["Link light rail", "Stadium district walking route", "Rideshare away from stadium exits"];
  if (city.includes("dallas")) return ["Official parking/shuttle", "Hotel shuttle", "Rideshare pickup zones"];
  if (city.includes("houston")) return ["METRORail connections", "Official parking", "Rideshare pickup zones"];
  if (city.includes("miami")) return ["Brightline or Tri-Rail plus shuttle", "Rideshare pickup zones", "Hotel transfer"];
  if (city.includes("atlanta")) return ["MARTA to stadium area", "Downtown walking route", "Rideshare after crowd release"];
  if (city.includes("philadelphia")) return ["SEPTA Broad Street Line", "Sports complex walking route", "Taxi/rideshare after match"];
  if (city.includes("boston")) return ["Commuter rail/event train when available", "Official shuttle", "Pre-booked transfer"];

  return ["Official stadium transportation", "Hotel shuttle or verified rideshare", "Arrive early and avoid unofficial taxis"];
}

function safetyTipsFor(stadium: MapDestination) {
  const city = normalize(stadium.city);
  const tips = [
    "Arrive 2-3 hours before kickoff.",
    "Save tickets, hotel address, and return route offline.",
    "Use official transport, marked taxis, or verified rideshare only."
  ];

  if (city.includes("mexico")) tips.push("Hydrate before arrival and pace yourself at altitude.");
  if (city.includes("dallas") || city.includes("houston") || city.includes("miami")) tips.push("Plan for heat, sunscreen, and water breaks.");
  if (city.includes("los angeles")) tips.push("Leave extra time for traffic around the stadium.");
  if (city.includes("new york") || city.includes("jersey")) tips.push("Expect crowded train platforms after full-time.");

  return tips;
}

function stadiumRules() {
  return [
    "Use mobile tickets and keep brightness high at entry.",
    "Carry government ID or passport copy where required.",
    "Avoid large backpacks and check the venue bag policy before leaving.",
    "No outside alcohol, weapons, fireworks, or prohibited banners.",
    "Follow FIFA, venue, and local security instructions."
  ];
}

export function StadiumDetailPage({ onBack, stadium, setMapDestination, setTab }: Props) {
  const [matches, setMatches] = useState<FanAtlasMatch[]>([]);
  const [stadiums, setStadiums] = useState<FanAtlasStadium[]>([]);
  const [weather, setWeather] = useState<FanAtlasWeather>(() => emptyWeather());
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    getWorldCup2026Games().then(setMatches).catch(() => setMatches([]));
    getWorldCup2026Stadiums().then(setStadiums).catch(() => setStadiums([]));
  }, []);

  const selected = stadium || stadiumDestinations[0];
  const destination = getStadiumDestination(selected.name, selected.city) || selected;
  const info = stadiums.find((item) => normalize(item.name) === normalize(selected.name));
  const city = cityKey(selected.city);
  const venueMatches = matches.filter((match) => normalize(match.stadium) === normalize(selected.name));
  const nearbyPlaces = defaultMapDestinations.filter((place) => (
    place.name !== selected.name &&
    normalize(place.city).includes(normalize(city)) &&
    (place.type === "hotel" || place.type === "restaurant" || place.type === "cafe")
  ));
  const nearbyHotels = nearbyPlaces.filter((place) => place.type === "hotel").slice(0, 3);
  const nearbyRestaurants = nearbyPlaces.filter((place) => place.type === "restaurant" || place.type === "cafe").slice(0, 3);
  const nearbyFanZones = fanZoneDestinations.filter((place) => (
    normalize(place.city).includes(normalize(city)) || normalize(city).includes(normalize(place.city))
  )).slice(0, 3);

  const capacity = info?.capacity || "Capacity unavailable";
  const image = stadiumImages[selected.name] || stadiumImages["MetLife Stadium"];

  useEffect(() => {
    getWeather(destination.lat, destination.lng)
      .then((result) => {
        setWeather(result);
        setWeatherError("");
      })
      .catch((error) => {
        console.error("Stadium weather error:", error);
        setWeather(emptyWeather());
        setWeatherError("Weather unavailable. Review conditions again before departure.");
      });
  }, [destination.lat, destination.lng]);

  function navigateToStadium() {
    setMapDestination(destination);
    setTab("map");
  }

  return (
    <div className="stadium-detail-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Stadium <span>Guide</span></div>
          <div className="subtle">{selected.city}</div>
        </div>
        <button className="mini-btn" onClick={() => setTab("matches")}>Matches</button>
      </div>

      <section className="stadium-hero">
        <img src={image} alt={selected.name} />
        <div className="stadium-hero-overlay">
          <span>{selected.city}</span>
          <h1>{selected.name}</h1>
          <p>Capacity: {capacity}</p>
        </div>
      </section>

      <div className="stadium-action-grid">
        <button className="primary-btn" onClick={navigateToStadium}>Navigate</button>
        <FavoriteButton
          item={{
            item_type: "stadium",
            item_id: selected.name,
            name: selected.name,
            city: selected.city,
            image,
            metadata: {
              destination
            }
          }}
        />
        <button className="secondary-btn" onClick={() => setTab("matches")}>View Matches</button>
      </div>

      <section className="stadium-section">
        <h3>Weather</h3>
        <div className="weather-metrics">
          <span>Temp <strong>{formatWeatherValue(weather.temperature, "°C")}</strong></span>
          <span>Rain <strong>{formatWeatherValue(weather.rainProbability, "%")}</strong></span>
          <span>Wind <strong>{formatWeatherValue(weather.windSpeed, " km/h")}</strong></span>
        </div>
        <div className="stadium-info-row">🌤 {weatherError || weather.recommendation}</div>
      </section>

      <section className="stadium-section">
        <h3>Transportation</h3>
        {transportationFor(selected).map((item) => (
          <div className="stadium-info-row" key={item}>🚇 {item}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Nearby Hotels</h3>
        {(nearbyHotels.length ? nearbyHotels : [{ name: `${city} stadium hotel search`, city, emoji: "🏨", type: "hotel" }]).map((place: any) => (
          <div className="stadium-info-row" key={place.name}>{place.emoji || "🏨"} {place.name} · {place.city}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Nearby Restaurants</h3>
        {(nearbyRestaurants.length ? nearbyRestaurants : [{ name: `${city} restaurants near stadium`, city, emoji: "🍽", type: "restaurant" }]).map((place: any) => (
          <div className="stadium-info-row" key={place.name}>{place.emoji || "🍽"} {place.name} · {place.city}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Nearby Fan Zones</h3>
        {(nearbyFanZones.length ? nearbyFanZones : [{ name: `${city} official fan zone`, city, emoji: "🎉" }]).map((place: any) => (
          <div className="stadium-info-row" key={place.name}>{place.emoji || "🎉"} {place.name} · {place.city}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Safety Tips</h3>
        {safetyTipsFor(selected).map((tip) => (
          <div className="stadium-info-row" key={tip}>✓ {tip}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Stadium Rules</h3>
        {stadiumRules().map((rule) => (
          <div className="stadium-info-row" key={rule}>• {rule}</div>
        ))}
      </section>

      <section className="stadium-section">
        <h3>Matches at this stadium</h3>
        {venueMatches.slice(0, 6).map((match) => (
          <div className="stadium-match-row" key={match.id}>
            <strong>{match.team1} vs {match.team2}</strong>
            <span>{match.date} · {match.time}</span>
          </div>
        ))}
        {venueMatches.length === 0 && <p className="subtle">Matches are loading or unavailable for this venue.</p>}
      </section>
    </div>
  );
}
