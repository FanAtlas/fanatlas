import { useEffect, useState } from "react";

type CountryKey = "USA" | "Canada" | "Mexico";

type OfflineGuide = {
  country: CountryKey;
  emergencyNumbers: string[];
  transportation: string[];
  currency: string;
  localCustoms: string[];
  safetyTips: string[];
  stadiumCities: string[];
};

const STORAGE_KEY = "fanatlas.offlineGuides";

const guides: OfflineGuide[] = [
  {
    country: "USA",
    emergencyNumbers: ["Emergency: 911", "Poison Control: 1-800-222-1222", "Traveler help: contact your consulate"],
    transportation: ["Use official stadium shuttles where available.", "Use public transit in New York, Philadelphia, Atlanta, Seattle, and Bay Area cities.", "Use verified rideshare pickup zones after matches."],
    currency: "US Dollar (USD). Cards are widely accepted, but carry a small backup card or cash.",
    localCustoms: ["Tip 15-20% at restaurants.", "Bring photo ID for hotel check-in and some venues.", "Expect airport-style security at stadiums."],
    safetyTips: ["Call 911 for police, fire, or medical emergencies.", "Avoid unofficial ticket sellers and unmarked taxis.", "Save hotel address and route offline before kickoff."],
    stadiumCities: ["New York/New Jersey", "Los Angeles", "Dallas", "San Francisco Bay Area", "Seattle", "Houston", "Atlanta", "Miami", "Kansas City", "Philadelphia", "Boston"]
  },
  {
    country: "Canada",
    emergencyNumbers: ["Emergency: 911", "Health advice: 811 in many provinces", "Traveler help: contact your consulate"],
    transportation: ["Use TTC and GO Transit in Toronto.", "Use SkyTrain and downtown walking routes in Vancouver.", "Expect crowd controls near stations after matches."],
    currency: "Canadian Dollar (CAD). Cards are widely accepted; contactless payment is common.",
    localCustoms: ["Tipping 15-20% is common.", "Weather can change quickly; carry a light layer.", "Respect queueing and transit staff directions."],
    safetyTips: ["Call 911 for urgent help.", "Keep bags closed in crowded fan zones.", "Plan late-night return routes before leaving your hotel."],
    stadiumCities: ["Toronto", "Vancouver"]
  },
  {
    country: "Mexico",
    emergencyNumbers: ["Emergency: 911", "Tourist help: ask hotel or local police for the nearest tourist assistance office", "Traveler help: contact your consulate"],
    transportation: ["Use official taxis, verified rideshare, or hotel-arranged transfers.", "For Estadio Azteca, combine metro/light rail with official guidance where available.", "Avoid informal rides offered outside airports or stadiums."],
    currency: "Mexican Peso (MXN). Cards are common in cities; carry small pesos for local purchases.",
    localCustoms: ["Basic Spanish phrases help with taxis and restaurants.", "Tip around 10-15% at restaurants.", "Carry a passport copy and keep the original secured when possible."],
    safetyTips: ["Call 911 for emergencies.", "Hydrate in Mexico City due to altitude.", "Use well-lit routes and travel with groups after matches."],
    stadiumCities: ["Mexico City", "Guadalajara", "Monterrey"]
  }
];

function readOfflineCountries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function OfflineGuidePage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>("USA");
  const [offlineCountries, setOfflineCountries] = useState<string[]>(() => readOfflineCountries());
  const guide = guides.find((item) => item.country === selectedCountry) || guides[0];
  const isSaved = offlineCountries.includes(selectedCountry);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineCountries));
  }, [offlineCountries]);

  function saveForOffline() {
    setOfflineCountries((current) => (
      current.includes(selectedCountry) ? current : [...current, selectedCountry]
    ));
  }

  function removeOffline() {
    setOfflineCountries((current) => current.filter((country) => country !== selectedCountry));
  }

  return (
    <div className="offline-guide-page">
      <div className="topbar">
        <div>
          <div className="brand">Offline <span>Guides</span></div>
          <div className="subtle">USA, Canada, and Mexico travel essentials</div>
        </div>
      </div>

      <div className="offline-hero">
        <h1>{guide.country} Offline Travel Guide</h1>
        <p>Save emergency, transport, currency, customs, safety, and stadium city details before match day.</p>
        <div className="offline-actions">
          <button className="primary-btn" onClick={saveForOffline}>
            {isSaved ? "Saved Offline" : "Allow Offline Access"}
          </button>
          {isSaved && <button className="secondary-btn" onClick={removeOffline}>Remove Offline</button>}
        </div>
      </div>

      <div className="country-tabs">
        {guides.map((item) => (
          <button
            className={selectedCountry === item.country ? "active" : ""}
            key={item.country}
            onClick={() => setSelectedCountry(item.country)}
          >
            {item.country}
            {offlineCountries.includes(item.country) && <span>Saved</span>}
          </button>
        ))}
      </div>

      <section className="offline-section emergency">
        <h3>Emergency Numbers</h3>
        {guide.emergencyNumbers.map((item) => <p key={item}>{item}</p>)}
      </section>

      <section className="offline-section">
        <h3>Transportation</h3>
        {guide.transportation.map((item) => <p key={item}>{item}</p>)}
      </section>

      <section className="offline-section">
        <h3>Currency</h3>
        <p>{guide.currency}</p>
      </section>

      <section className="offline-section">
        <h3>Local Customs</h3>
        {guide.localCustoms.map((item) => <p key={item}>{item}</p>)}
      </section>

      <section className="offline-section">
        <h3>Safety Tips</h3>
        {guide.safetyTips.map((item) => <p key={item}>{item}</p>)}
      </section>

      <section className="offline-section">
        <h3>Stadium Cities</h3>
        <div className="offline-city-grid">
          {guide.stadiumCities.map((city) => <span key={city}>{city}</span>)}
        </div>
      </section>
    </div>
  );
}
