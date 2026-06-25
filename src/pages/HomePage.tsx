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
import { useLocation } from "../LocationContext";
import { distanceKm, formatDistance } from "../lib/location";
import { fanZoneDestinations, getPlaceDestination, placeDestinations } from "../mapDestinations";
import { hotelOffers } from "./HotelsPage";

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
  const { location, status: locationStatus } = useLocation();
  const [matches, setMatches] = useState<FanAtlasMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getWorldCup2026Games()
      .then(setMatches)
      .catch((error) => {
        console.error("Home schedule error:", error);
        setMatches([]);
      });
  }, []);

  const nextMatch = useMemo(() => getNextMatch(matches), [matches]);
  const nearbyGroups = useMemo(() => {
    if (!location) return null;

    const sortNearby = <T extends { lat: number; lng: number }>(items: T[]) =>
      items
        .map((item) => ({ ...item, userDistanceKm: distanceKm(location, item) }))
        .sort((a, b) => a.userDistanceKm - b.userDistanceKm)
        .slice(0, 3);

    return {
      fanZones: sortNearby(fanZoneDestinations),
      restaurants: sortNearby(placeDestinations.filter((place) => place.type === "restaurant" || place.type === "cafe")),
      hotels: sortNearby(hotelOffers)
    };
  }, [location]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const hotels = [
      { name: "Marriott Times Square", city: "New York" },
      { name: "Ibis Mexico City", city: "Mexico City" },
      { name: "Delta Hotels Toronto", city: "Toronto" }
    ];
    const cities = ["New York / New Jersey", "Los Angeles", "Mexico City", "Toronto", "Vancouver", "Dallas", "Miami"];
    const results = [
      ...knownStadiums.map((item) => ({ type: "stadium", name: item.name, city: item.city })),
      ...places.map((item) => ({ type: "restaurant", name: item.name, city: item.city, item })),
      ...fanZones.map((item) => ({ type: "fan-zone", name: item.name, city: item.city })),
      ...hotels.map((item) => ({ type: "hotel", name: item.name, city: item.city })),
      ...cities.map((city) => ({ type: "city", name: city, city }))
    ];

    return results
      .filter((item) => `${item.name} ${item.city} ${item.type}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchQuery]);
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

      <label className="searchbar home-search">
        <Search size={18} />
        <input
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
            <h3>Near You</h3>
            {location && <span className="subtle">{location.city || location.country || "Based on your location"}</span>}
          </div>
        </div>

        {!nearbyGroups && locationStatus !== "requesting" && (
          <div className="location-fallback">Enable location for nearby recommendations.</div>
        )}

        {nearbyGroups && (
          <div className="nearby-groups">
            <div className="nearby-group">
              <strong>Fan zones</strong>
              {nearbyGroups.fanZones.map((item) => (
                <button key={item.name} onClick={() => {
                  setMapDestination(getFanZoneDestination(item.name) || null);
                  setTab("map");
                }}>
                  <span>🎉 {item.name}</span>
                  <small>{formatDistance(item.userDistanceKm)}</small>
                </button>
              ))}
            </div>

            <div className="nearby-group">
              <strong>Restaurants</strong>
              {nearbyGroups.restaurants.map((item) => (
                <button key={item.name} onClick={() => {
                  const restaurant = places.find((place) => place.name === item.name);
                  if (restaurant) {
                    setSelectedRestaurant(restaurant);
                    setTab("restaurant");
                  }
                }}>
                  <span>🍽 {item.name}</span>
                  <small>{formatDistance(item.userDistanceKm)}</small>
                </button>
              ))}
            </div>

            <div className="nearby-group">
              <strong>Hotels</strong>
              {nearbyGroups.hotels.map((item) => (
                <button key={item.id} onClick={() => {
                  setMapDestination(getPlaceDestination(item.name, item.city) || {
                    name: item.name,
                    city: item.city,
                    lat: item.lat,
                    lng: item.lng,
                    emoji: "🏨",
                    type: "hotel"
                  });
                  setTab("map");
                }}>
                  <span>🏨 {item.name}</span>
                  <small>{formatDistance(item.userDistanceKm)}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="home-worldcup-card">
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
      </section>

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
