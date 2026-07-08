import { useEffect, useMemo, useState } from "react";
import { Bot, Hotel, MapPin, Search, Shield, Smartphone, Utensils, Trophy, Wrench } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { LegalFooter } from "../components/LegalFooter";
import { fanZones, places, stadiums as knownStadiums } from "../data/mockData";
import { Language } from "../i18n";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, MapDestination } from "../mapDestinations";
import { FanAtlasMatch, getWorldCup2026Games } from "../services/worldcup2026";
import { InstallBanner } from "./InstallBanner";
import { distanceKm, formatDistance } from "../lib/location";
import { destinations } from "../data/destinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import { countryFlag } from "../data/countries";

function getNextMatch(matches: FanAtlasMatch[]) {
  return matches.find((match) => match.status !== "Finished") || matches[0] || null;
}

export function HomePage({
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setTab
}: {
  setExploreCategory: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedRestaurant: (restaurant: any) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language, setLanguage, t } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const { groups, loading: placesLoading, message: placesMessage, refreshPlaces } = useGlobalPlaces();
  const [matches, setMatches] = useState<FanAtlasMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    getWorldCup2026Games()
      .then(setMatches)
      .catch((error) => {
        console.error("Home schedule error:", error);
        setMatches([]);
      });
  }, []);

  useEffect(() => {
    const message = sessionStorage.getItem("fanatlas_travel_toast");
    if (!message) return;

    setToast(message);
    sessionStorage.removeItem("fanatlas_travel_toast");
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  const nextMatch = useMemo(() => getNextMatch(matches), [matches]);
  const isEventDestination = useMemo(() => {
    const city = travelLocation.destinationCity.toLowerCase();
    return [...knownStadiums, ...fanZones].some((item) => item.city.toLowerCase().includes(city) || city.includes(item.city.toLowerCase()));
  }, [travelLocation.destinationCity]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const hotels = [
      { name: "Marriott Times Square", city: "New York" },
      { name: "Ibis Mexico City", city: "Mexico City" },
      { name: "Delta Hotels Toronto", city: "Toronto" }
    ];
    const cities = destinations.map((destination) => `${destination.city}, ${destination.country}`);
    const results = [
      ...knownStadiums.map((item) => ({ type: "stadium", name: item.name, city: item.city })),
      ...places.map((item) => ({ type: "restaurant", name: item.name, city: item.city, item })),
      ...fanZones.map((item) => ({ type: "fan-zone", name: item.name, city: item.city })),
      ...[...groups.hotels, ...groups.restaurants, ...groups.attractions].map((item) => ({ type: item.category, name: item.name, city: item.city, item })),
      ...hotels.map((item) => ({ type: "hotel", name: item.name, city: item.city })),
      ...cities.map((city) => ({ type: "city", name: city, city }))
    ];

    return results
      .filter((item) => `${item.name} ${item.city} ${item.type}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [groups.attractions, groups.hotels, groups.restaurants, searchQuery]);
  const quickActions = [
    { label: "Map", icon: MapPin, tab: "map" as Tab },
    { label: "Hotels", icon: Hotel, tab: "hotels" as Tab },
    { label: "Restaurants", icon: Utensils, tab: "explore" as Tab, category: "Restaurants" },
    { label: "Travel Tools", icon: Wrench, tab: "traveltools" as Tab },
    { label: "eSIM", icon: Smartphone, tab: "esim" as Tab },
    { label: "SOS", icon: Shield, tab: "sos" as Tab }
  ];

  return (
    <div className="home-compact-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <InstallBanner />

      <div className="topbar">
        <div>
          <div className="brand">FanAtlas <span>Travel</span></div>
          <div className="subtle">Global travel companion</div>
        </div>

        <select
          className="language-pill"
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
        >
          <option value="en">🇺🇸 English</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="es">🇪🇸 Español</option>
          <option value="ar">🇲🇦 العربية</option>
          <option value="pt">🇵🇹 Português</option>
        </select>
      </div>

      <button className="travel-location-pill" onClick={() => setTab("travelLocation")}>
        <span>
          <small>Traveling to</small>
          <strong>{countryFlag(travelLocation.destinationCountry)} {travelLocation.destinationCity}, {travelLocation.destinationCountry}</strong>
        </span>
        <strong>Change</strong>
      </button>

      {toast && <div className="travel-toast">{toast}</div>}

      {travelLocation.locationSource === "fallback" && (
        <div className="location-fallback">Set your travel destination for better recommendations.</div>
      )}

      <label className="searchbar home-search">
        <Search size={18} />
        <input
          className="fan-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t.whereGoing}
        />
      </label>

      {searchQuery.trim() && (
        <div className="home-search-results">
          {searchResults.length === 0 && <div className="home-search-empty">No results found.</div>}
          {searchResults.map((result) => (
            <button
              className="fan-list-item"
              key={`${result.type}-${result.name}`}
              onClick={() => {
                if (result.type === "restaurant" && "item" in result) {
                  setSelectedRestaurant(result.item);
                  setTab("restaurant");
                  return;
                }

                if (result.type === "stadium") {
                  setMapDestination(getStadiumDestination(result.name, result.city) || null);
                  setTab("map");
                  return;
                }

                if (result.type === "fan-zone") {
                  setMapDestination(getFanZoneDestination(result.name) || null);
                  setTab("map");
                  return;
                }

                if ("item" in result && result.item && "category" in result.item) {
                  setMapDestination(globalPlaceDestination(result.item as GlobalPlace));
                  setTab("map");
                  return;
                }

                if (result.type === "hotel") {
                  setTab("hotels");
                  return;
                }

                setExploreCategory("All");
                setTab("explore");
              }}
            >
              <strong>{result.name}</strong>
              <span>{result.type} · {result.city}</span>
            </button>
          ))}
        </div>
      )}

      <section className="home-compact-hero">
        <div>
          <span>Travel planning</span>
          <h1>{t.planTripSeconds}</h1>
          <p>{t.homeHeroSubtitle}</p>
        </div>
        <button className="primary-btn" onClick={() => setTab("ai")}>
          <Bot size={18} /> {t.askAITravelAssistant}
        </button>
      </section>

      <div className="quick-grid home-compact-actions">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              className="quick-card"
              key={action.label}
              onClick={() => {
                if (action.tab === "map") setMapDestination(null);
                if (action.category) setExploreCategory(action.category);
                setTab(action.tab);
              }}
            >
              <Icon size={22} />
              <span>{action.label === "Restaurants" ? t.restaurants : action.label === "Travel Tools" ? t.travelTools : action.label === "Hotels" ? t.hotels : action.label === "Map" ? t.map : action.label === "SOS" ? t.sos : action.label}</span>
            </button>
          );
        })}
      </div>

      <section className="nearby-section">
        <div className="section-row">
          <div>
            <h3>{travelLocation.destinationCity} Travel Picks</h3>
            <span className="subtle">Based on {travelLocation.destinationCity}, {travelLocation.destinationCountry}</span>
          </div>
        </div>

        {placesLoading && <div className="location-fallback">{placesMessage || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
        {!placesLoading && placesMessage && (
          <div className="location-fallback">
            {placesMessage}
            {placesMessage.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
          </div>
        )}

        {groups.hotels.length || groups.restaurants.length || groups.attractions.length ? (
          <div className="nearby-groups">
            {groups.attractions.length > 0 && (
              <div className="nearby-group">
                <strong>Attractions</strong>
                {groups.attractions.slice(0, 3).map((item) => (
                  <button className="fan-list-item" key={item.name} onClick={() => {
                    setMapDestination(globalPlaceDestination(item));
                    setTab("map");
                  }}>
                    <span>{placeEmoji(item.category)} {item.name}</span>
                    <small>{formatDistance(distanceKm(travelLocation, item))}</small>
                  </button>
                ))}
              </div>
            )}

            <div className="nearby-group">
              <strong>Nearby Restaurants</strong>
              {groups.restaurants.length > 0 ? groups.restaurants.slice(0, 3).map((item) => (
                <button className="fan-list-item" key={item.name} onClick={() => {
                  setSelectedRestaurant({ ...item, cuisine: item.detail, rating: 4.5, price: "" });
                  setTab("restaurant");
                }}>
                  <span>{placeEmoji(item.category)} {item.name}</span>
                  <small>{formatDistance(distanceKm(travelLocation, item))}</small>
                </button>
              )) : <p className="subtle">Open Map or ask the AI Travel Assistant for restaurant ideas.</p>}
            </div>

            <div className="nearby-group">
              <strong>Nearby Hotels</strong>
              {groups.hotels.length > 0 ? groups.hotels.slice(0, 3).map((item) => (
                <button className="fan-list-item" key={item.id} onClick={() => {
                  setMapDestination(globalPlaceDestination(item));
                  setTab("map");
                }}>
                  <span>{placeEmoji(item.category)} {item.name}</span>
                  <small>{formatDistance(distanceKm(travelLocation, item))}</small>
                </button>
              )) : <p className="subtle">Use hotel search or Map while live places refresh.</p>}
            </div>
          </div>
        ) : (
          <div className="card-dark">
            <strong>{travelLocation.destinationCity} travel tools are ready.</strong>
            <p className="subtle">Open Map, SOS, hotels, restaurants, or the AI Travel Assistant while live places refresh.</p>
            <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
          </div>
        )}
      </section>

      {isEventDestination && <section className="home-worldcup-card">
        <div className="section-row">
          <div>
            <span>Featured Event</span>
            <h3>World Cup 2026</h3>
          </div>
          <Trophy size={24} />
        </div>

        <div className="worldcup-mini-grid">
          <div>
            <span>Next Match</span>
            <strong>{nextMatch ? `${nextMatch.homeTeam} vs ${nextMatch.awayTeam}` : "Loading schedule"}</strong>
            <p>{nextMatch ? `${nextMatch.date} · ${nextMatch.kickoffTime}` : "Live match API"}</p>
          </div>
          <div>
            <span>Stadiums</span>
            <strong>16 host venues</strong>
          </div>
          <div>
            <span>Fan Zones</span>
            <strong>City events</strong>
          </div>
        </div>

        <button className="secondary-btn full-width" onClick={() => setTab("matches")}>
          {t.openMatchCenter}
        </button>
      </section>}

      <section className="home-sos-mini">
        <div>
          <strong>SOS Emergency</strong>
          <p>Emergency numbers, hospitals, police, and embassy help.</p>
        </div>
        <button className="primary-btn" onClick={() => setTab("sos")}>{t.open}</button>
      </section>

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function globalPlaceDestination(place: GlobalPlace): MapDestination {
  return {
    name: place.name,
    city: place.city,
    lat: place.lat,
    lng: place.lng,
    emoji: placeEmoji(place.category),
    type: place.category === "restaurant" ? "restaurant" :
      place.category === "hotel" ? "hotel" :
      place.category === "hospital" ? "hospital" :
      place.category === "police" ? "police" :
      place.category === "embassy" ? "embassy" :
      "place",
    address: place.address,
    openingHours: place.detail,
    safetyNotes: place.source === "openstreetmap" ? "OpenStreetMap community place data. Verify critical details before travel." : undefined
  };
}
