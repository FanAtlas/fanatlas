import { useEffect, useMemo, useState } from "react";
import { languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { supabase } from "../lib/supabase";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";

type EmergencyCategory = "hospital" | "police" | "embassy";

type EmergencyLocation = MapDestination & {
  category: EmergencyCategory;
  phone: string;
  address: string;
  website: string;
  note: string;
  country?: string;
};

const fallbackLocation: [number, number] = [40.758, -73.9855];
const NEARBY_RADIUS_KM = 150;

const hospitals: EmergencyLocation[] = [
  {
    name: "Mount Sinai Hospital",
    city: "New York",
    lat: 40.7901,
    lng: -73.9526,
    emoji: "🏥",
    type: "hospital",
    category: "hospital",
    phone: "+1 212-241-6500",
    address: "1468 Madison Ave, New York, NY",
    website: "https://www.mountsinai.org/",
    note: "Emergency department and major hospital network"
  },
  {
    name: "Cedars-Sinai Medical Center",
    city: "Los Angeles",
    lat: 34.0755,
    lng: -118.3808,
    emoji: "🏥",
    type: "hospital",
    category: "hospital",
    phone: "+1 310-423-3277",
    address: "8700 Beverly Blvd, Los Angeles, CA",
    website: "https://www.cedars-sinai.org/",
    note: "Emergency care near central Los Angeles"
  },
  {
    name: "Toronto General Hospital",
    city: "Toronto",
    lat: 43.6596,
    lng: -79.3888,
    emoji: "🏥",
    type: "hospital",
    category: "hospital",
    phone: "+1 416-340-4800",
    address: "200 Elizabeth St, Toronto, ON",
    website: "https://www.uhn.ca/",
    note: "Downtown hospital and emergency care"
  },
  {
    name: "Hospital General de Mexico",
    city: "Mexico City",
    lat: 19.4107,
    lng: -99.1506,
    emoji: "🏥",
    type: "hospital",
    category: "hospital",
    phone: "+52 55 2789 2000",
    address: "Dr Balmis 148, Doctores, Mexico City",
    website: "https://hgm.salud.gob.mx/",
    note: "Public general hospital in Mexico City"
  }
];

const policeStations: EmergencyLocation[] = [
  {
    name: "NYPD Times Square Substation",
    city: "New York",
    lat: 40.7587,
    lng: -73.9851,
    emoji: "👮",
    type: "police",
    category: "police",
    phone: "911",
    address: "Times Square, New York, NY",
    website: "https://www.nyc.gov/site/nypd/index.page",
    note: "Use 911 for emergencies in New York"
  },
  {
    name: "LAPD Hollywood Station",
    city: "Los Angeles",
    lat: 34.0954,
    lng: -118.3301,
    emoji: "👮",
    type: "police",
    category: "police",
    phone: "911",
    address: "1358 N Wilcox Ave, Los Angeles, CA",
    website: "https://www.lapdonline.org/",
    note: "Use 911 for police, fire, or ambulance"
  },
  {
    name: "Toronto Police Headquarters",
    city: "Toronto",
    lat: 43.6535,
    lng: -79.3841,
    emoji: "👮",
    type: "police",
    category: "police",
    phone: "911",
    address: "40 College St, Toronto, ON",
    website: "https://www.tps.ca/",
    note: "Use 911 for emergencies in Canada"
  },
  {
    name: "Mexico City Citizen Security",
    city: "Mexico City",
    lat: 19.4326,
    lng: -99.1332,
    emoji: "👮",
    type: "police",
    category: "police",
    phone: "911",
    address: "Centro Historico, Mexico City",
    website: "https://www.ssc.cdmx.gob.mx/",
    note: "Use 911 for emergencies in Mexico"
  }
];

const embassyDirectory: Record<string, EmergencyLocation> = {
  Morocco: {
    name: "Embassy of Morocco",
    city: "Washington, DC",
    lat: 38.9436,
    lng: -77.0672,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-462-7979",
    address: "3508 International Dr NW, Washington, DC",
    website: "https://us.diplomatie.ma/",
    note: "Consular help for Moroccan citizens"
  },
  France: {
    name: "Embassy of France",
    city: "Washington, DC",
    lat: 38.9137,
    lng: -77.0779,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-944-6000",
    address: "4101 Reservoir Rd NW, Washington, DC",
    website: "https://franceintheus.org/",
    note: "Consular help for French citizens"
  },
  "United States": {
    name: "U.S. Embassy / Consular Emergency Help",
    city: "Worldwide",
    lat: 38.8949,
    lng: -77.0366,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-501-4444",
    address: "U.S. Department of State consular assistance",
    website: "https://travel.state.gov/content/travel/en/international-travel/emergencies.html",
    note: "Emergency assistance for U.S. citizens abroad"
  },
  USA: {
    name: "U.S. Embassy / Consular Emergency Help",
    city: "Worldwide",
    lat: 38.8949,
    lng: -77.0366,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-501-4444",
    address: "U.S. Department of State consular assistance",
    website: "https://travel.state.gov/content/travel/en/international-travel/emergencies.html",
    note: "Emergency assistance for U.S. citizens abroad"
  },
  Canada: {
    name: "Embassy of Canada",
    city: "Washington, DC",
    lat: 38.8954,
    lng: -77.0308,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 613-996-8885",
    address: "501 Pennsylvania Avenue NW, Washington, DC",
    website: "https://travel.gc.ca/assistance/emergency-assistance",
    note: "Emergency assistance for Canadian citizens"
  },
  Mexico: {
    name: "Embassy of Mexico",
    city: "Washington, DC",
    lat: 38.9134,
    lng: -77.0484,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-736-1000",
    address: "1911 Pennsylvania Avenue NW, Washington, DC",
    website: "https://embamex.sre.gob.mx/eua/",
    note: "Consular help for Mexican citizens"
  },
  Brazil: {
    name: "Embassy of Brazil",
    city: "Washington, DC",
    lat: 38.9191,
    lng: -77.0525,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-238-2700",
    address: "3006 Massachusetts Avenue NW, Washington, DC",
    website: "https://www.gov.br/mre/pt-br/embaixada-washington",
    note: "Consular help for Brazilian citizens"
  },
  Argentina: {
    name: "Embassy of Argentina",
    city: "Washington, DC",
    lat: 38.9119,
    lng: -77.0455,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-238-6400",
    address: "1600 New Hampshire Avenue NW, Washington, DC",
    website: "https://eeeuu.cancilleria.gob.ar/",
    note: "Consular help for Argentine citizens"
  },
  Portugal: {
    name: "Embassy of Portugal",
    city: "Washington, DC",
    lat: 38.9141,
    lng: -77.0522,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-332-3007",
    address: "2012 Massachusetts Avenue NW, Washington, DC",
    website: "https://washingtondc.embaixadaportugal.mne.gov.pt/",
    note: "Consular help for Portuguese citizens"
  },
  Spain: {
    name: "Embassy of Spain",
    city: "Washington, DC",
    lat: 38.9128,
    lng: -77.0548,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-452-0100",
    address: "2375 Pennsylvania Avenue NW, Washington, DC",
    website: "https://www.exteriores.gob.es/Embajadas/washington/",
    note: "Consular help for Spanish citizens"
  },
  "United Kingdom": {
    name: "British Embassy",
    city: "Washington, DC",
    lat: 38.9169,
    lng: -77.0482,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-588-6500",
    address: "3100 Massachusetts Avenue NW, Washington, DC",
    website: "https://www.gov.uk/world/organisations/british-embassy-washington",
    note: "Consular help for British citizens"
  },
  England: {
    name: "British Embassy",
    city: "Washington, DC",
    lat: 38.9169,
    lng: -77.0482,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "+1 202-588-6500",
    address: "3100 Massachusetts Avenue NW, Washington, DC",
    website: "https://www.gov.uk/world/organisations/british-embassy-washington",
    note: "Consular help for British citizens"
  }
};

const phrases = [
  ["English", "I need help. Call an ambulance. Where is the hospital?"],
  ["Spanish", "Necesito ayuda. Llame una ambulancia. ¿Dónde está el hospital?"],
  ["French", "J'ai besoin d'aide. Appelez une ambulance. Où est l'hôpital ?"],
  ["Arabic", "أحتاج إلى مساعدة. اتصل بالإسعاف. أين المستشفى؟"],
  ["Portuguese", "Preciso de ajuda. Chame uma ambulância. Onde fica o hospital?"]
];

function distanceKm(origin: [number, number], destination: EmergencyLocation) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin[0]);
  const dLng = toRad(destination.lng - origin[1]);
  const lat1 = toRad(origin[0]);
  const lat2 = toRad(destination.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function fallbackEmbassy(country: string): EmergencyLocation {
  return {
    name: country ? `${country} Embassy / Consulate Directory` : "Embassy / Consulate Directory",
    city: "Nearest host city",
    lat: 38.9072,
    lng: -77.0369,
    emoji: "🏛",
    type: "embassy",
    category: "embassy",
    phone: "911",
    address: "Use the website to find your country's nearest embassy or consulate",
    website: "https://www.embassy-worldwide.com/",
    note: country ? `Find consular help for travelers from ${country}` : "Find your nearest embassy or consulate"
  };
}

export function SOSPage({
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<EmergencyCategory>("hospital");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    async function loadCountry() {
      if (!supabase) return;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", user.id)
        .maybeSingle();

      setCountry(data?.country || "");
    }

    loadCountry();
  }, []);

  useEffect(() => {
    locateAndShow("hospital");
  }, []);

  const embassy = embassyDirectory[country] || fallbackEmbassy(country);
  const locations = useMemo(() => ({
    hospital: hospitals,
    police: policeStations,
    embassy: [embassy]
  }), [embassy]);

  const nearbyLocations = useMemo(() => {
    if (!userLocation) {
      return locations[activeCategory].slice(0, 3).map((location) => ({
        ...location,
        distance: null as number | null
      }));
    }

    return locations[activeCategory]
      .map((location) => ({
        ...location,
        distance: distanceKm(userLocation, location) as number | null
      }))
      .filter((location) => (location.distance ?? Infinity) <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [activeCategory, locations, userLocation]);

  function locateAndShow(category: EmergencyCategory) {
    setActiveCategory(category);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Enable location for nearby results.");
      setUserLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setLocationError("Enable location for nearby results.");
        setUserLocation(null);
      }
    );
  }

  function openDirections(location: EmergencyLocation) {
    setMapDestination(location);
    setTab("map");
  }

  return (
    <div className="sos-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div className="brand">FanAtlas <span>2026</span></div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <a href="tel:911" className="sos-hero">
        <span>⚠️</span>
        <h2>{t.sosEmergency}</h2>
        <p>{t.tapEmergency}</p>
      </a>

      <div className="sos-category-grid">
        <button
          className={activeCategory === "hospital" ? "active" : ""}
          onClick={() => locateAndShow("hospital")}
        >
          🏥 {t.hospitals}
        </button>
        <button
          className={activeCategory === "police" ? "active" : ""}
          onClick={() => locateAndShow("police")}
        >
          👮 Police
        </button>
        <button
          className={activeCategory === "embassy" ? "active" : ""}
          onClick={() => locateAndShow("embassy")}
        >
          🏛 Consulates & Embassies
        </button>
      </div>

      {locationError && (
        <div className="route-status error">{locationError}</div>
      )}

      <div className="card-dark">
        <strong>{userLocation ? "Nearby" : "Host-city"} {activeCategory === "embassy" ? "consular help" : activeCategory}</strong>
        <p className="subtle">
          {userLocation ? "Sorted from your current location." : "Enable location for nearby results."}
          {activeCategory === "embassy" && country ? ` Based on onboarding country: ${country}.` : ""}
        </p>
      </div>

      <div className="sos-location-list">
        {userLocation && nearbyLocations.length === 0 && (
          <div className="card-dark">
            <strong>No nearby results found.</strong>
            <p className="subtle">Use the emergency number above or try a different category.</p>
          </div>
        )}

        {nearbyLocations.map((location) => (
          <div className="sos-location-card" key={`${location.category}-${location.name}`}>
            <div className="sos-location-main">
              <span>{location.emoji}</span>
              <div>
                <strong>{location.name}</strong>
                <p>{location.city} · {location.address}</p>
                <p>{location.note}</p>
                <small>{location.distance === null ? "Enable location for nearby results." : `${location.distance.toFixed(1)} km away`}</small>
              </div>
            </div>

            <div className="sos-actions">
              <a href={`tel:${location.phone}`}>Call</a>
              <button onClick={() => openDirections(location)}>Directions</button>
              <a href={location.website} target="_blank" rel="noreferrer">Website</a>
            </div>
          </div>
        ))}
      </div>

      <h3>{t.emergencyNumbers}</h3>
      <div className="sos-grid">
        {[
          { country: "USA", flag: "🇺🇸", phone: "911", note: t.policeFireAmbulance },
          { country: "Canada", flag: "🇨🇦", phone: "911", note: t.policeFireAmbulance },
          { country: "Mexico", flag: "🇲🇽", phone: "911", note: t.nationalEmergencyLine }
        ].map((item) => (
          <a className="sos-tile" href={`tel:${item.phone}`} key={item.country}>
            <strong>{item.flag} {item.country}</strong>
            <span>{item.phone}</span>
            <p>{item.note}</p>
          </a>
        ))}
      </div>

      <h3>{t.emergencyTranslation}</h3>
      {phrases.map(([label, phrase]) => (
        <div className="card-dark" key={label}>
          <strong>{label}</strong>
          <p>{phrase}</p>
        </div>
      ))}
    </div>
  );
}
