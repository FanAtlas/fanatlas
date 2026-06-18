import { useEffect, useMemo, useState } from "react";
import { Bot, Hotel, MapPin, Search, Shield, Smartphone, Utensils, Trophy, Wrench } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { places } from "../data/mockData";
import { Language } from "../i18n";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { FanAtlasMatch, getWorldCup2026Games } from "../services/worldcup2026";
import { InstallBanner } from "./InstallBanner";

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
  const { language, setLanguage } = useLanguage();
  const [matches, setMatches] = useState<FanAtlasMatch[]>([]);

  useEffect(() => {
    getWorldCup2026Games()
      .then(setMatches)
      .catch((error) => {
        console.error("Home schedule error:", error);
        setMatches([]);
      });
  }, []);

  const nextMatch = useMemo(() => getNextMatch(matches), [matches]);
  const restaurants = places.slice(0, 2);
  const quickActions = [
    { label: "Map", icon: MapPin, tab: "map" as Tab },
    { label: "Hotels", icon: Hotel, tab: "hotels" as Tab },
    { label: "Restaurants", icon: Utensils, tab: "explore" as Tab, category: "Restaurants" },
    { label: "Travel Tools", icon: Wrench, tab: "traveltools" as Tab },
    { label: "eSIM", icon: Smartphone, tab: "esim" as Tab },
    { label: "SOS", icon: Shield, tab: "sos" as Tab }
  ];

  function openRestaurant(restaurant: any) {
    setSelectedRestaurant({
      ...restaurant,
      cuisine: restaurant.cuisine || restaurant.category || "Local favorite"
    });
    setTab("restaurant");
  }

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
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
          <option value="pt">Português</option>
        </select>
      </div>

      <button
        className="searchbar home-search"
        onClick={() => {
          setExploreCategory("All");
          setTab("explore");
        }}
      >
        <Search size={18} />
        <span>Where are you going?</span>
      </button>

      <section className="home-compact-hero">
        <div>
          <span>Travel planning</span>
          <h1>Plan your trip in seconds</h1>
          <p>AI maps, hotels, restaurants, safety, and events in one place.</p>
        </div>
        <button className="primary-btn" onClick={() => setTab("ai")}>
          <Bot size={18} /> Ask AI Travel Assistant
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
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      <section className="home-worldcup-card">
        <div className="section-row">
          <div>
            <span>Featured event</span>
            <h3>World Cup 2026 Mode</h3>
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
          Open Match Center
        </button>
      </section>

      <section>
        <div className="section-row">
          <h3>Nearby / Trending</h3>
          <button
            className="mini-btn"
            onClick={() => {
              setExploreCategory("All");
              setTab("explore");
            }}
          >
            Explore More
          </button>
        </div>

        <div className="home-preview-grid">
          {restaurants.map((restaurant) => (
            <button className="home-preview-card" key={restaurant.name} onClick={() => openRestaurant(restaurant)}>
              <img src={restaurant.image} alt={restaurant.name} />
              <strong>{restaurant.name}</strong>
              <span>⭐ {restaurant.rating} · {restaurant.distance}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-sos-mini">
        <div>
          <strong>SOS Emergency</strong>
          <p>Emergency numbers, hospitals, police, and embassy help.</p>
        </div>
        <button className="primary-btn" onClick={() => setTab("sos")}>Open</button>
      </section>
    </div>
  );
}
