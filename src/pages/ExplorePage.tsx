import { ReactNode, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { LegalFooter } from "../components/LegalFooter";
import { places } from "../data/mockData";
import { useLanguage } from "../LanguageContext";
import { useLocation } from "../LocationContext";
import { directionsUrl, distanceKm, formatDistance } from "../lib/location";
import { languages } from "../i18n";
import { Tab } from "../main";
import { getPlaceDestination, MapDestination } from "../mapDestinations";
import { hotelOffers } from "./HotelsPage";

type ExploreCategory = "All" | "Attractions" | "Restaurants" | "Hotels" | "Transportation";

const categories: ExploreCategory[] = ["All", "Attractions", "Restaurants", "Hotels", "Transportation"];

const attractions = [
  { name: "Times Square", city: "New York", lat: 40.758, lng: -73.9855, detail: "Public screens, restaurants, transit, and late-night energy.", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=80" },
  { name: "Chapultepec Park", city: "Mexico City", lat: 19.4204, lng: -99.1819, detail: "Museums, green space, cafes, and a calmer day-before-match plan.", image: "https://images.unsplash.com/photo-1518659526054-190340b32735?auto=format&fit=crop&w=900&q=80" },
  { name: "CN Tower", city: "Toronto", lat: 43.6426, lng: -79.3871, detail: "City views and downtown attractions near major transit.", image: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=900&q=80" }
];

const transportation = [
  { name: "Penn Station", city: "New York", lat: 40.7506, lng: -73.9935, detail: "Rail, subway, and regional connections.", emoji: "🚆" },
  { name: "Union Station", city: "Toronto", lat: 43.6452, lng: -79.3806, detail: "TTC, GO Transit, and airport rail.", emoji: "🚆" },
  { name: "Metro Centro Médico", city: "Mexico City", lat: 19.4066, lng: -99.1553, detail: "Metro connections for central Mexico City.", emoji: "🚇" },
  { name: "LAX Airport", city: "Los Angeles", lat: 33.9416, lng: -118.4085, detail: "Airport shuttles, rideshare, and regional buses.", emoji: "✈️" }
];

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = (value || "All").toLowerCase();
  if (normalized.includes("restaurant") || normalized.includes("food")) return "Restaurants";
  if (normalized.includes("hotel") || normalized.includes("stay")) return "Hotels";
  if (normalized.includes("attraction")) return "Attractions";
  if (normalized.includes("transport")) return "Transportation";
  return "All";
}

export function ExplorePage({
  initialCategory = "All",
  setMapDestination,
  setTab,
  setSelectedRestaurant
}: {
  initialCategory?: string;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
  setSelectedRestaurant?: (restaurant: any) => void;
}) {
  const { language, t } = useLanguage();
  const { location, status: locationStatus } = useLocation();
  const [active, setActive] = useState<ExploreCategory>(() => normalizeCategory(initialCategory));
  const [query, setQuery] = useState("");

  useEffect(() => setActive(normalizeCategory(initialCategory)), [initialCategory]);

  const nearby = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sort = <T extends { name: string; city: string; lat: number; lng: number }>(items: T[]) =>
      items
        .filter((item) => !q || `${item.name} ${item.city}`.toLowerCase().includes(q))
        .map((item) => ({ ...item, userDistanceKm: location ? distanceKm(location, item) : null }))
        .sort((a, b) => {
          if (a.userDistanceKm === null || b.userDistanceKm === null) return 0;
          return a.userDistanceKm - b.userDistanceKm;
        });

    return {
      attractions: sort(attractions),
      restaurants: sort(places.map((place) => {
        const destination = getPlaceDestination(place.name, place.city);
        return { ...place, lat: destination?.lat ?? 0, lng: destination?.lng ?? 0 };
      })),
      hotels: sort(hotelOffers),
      transportation: sort(transportation)
    };
  }, [location, query]);

  const show = (category: ExploreCategory) => active === "All" || active === category;
  const distanceLabel = (value: number | null) => value === null ? null : `${formatDistance(value)} away`;

  function openMap(item: { name: string; city: string; lat: number; lng: number }, emoji: string, type: MapDestination["type"]) {
    setMapDestination(getPlaceDestination(item.name, item.city) || { ...item, emoji, type });
    setTab("map");
  }

  return (
    <div className="explore-page-v2" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">Explore <span>Near Me</span></div>
          <div className="subtle">{location?.city || location?.country || t.exploreSubtitle}</div>
        </div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <label className="explore-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nearby places" />
      </label>

      {locationStatus !== "available" && locationStatus !== "requesting" && (
        <div className="location-fallback">Enable location for nearby recommendations.</div>
      )}

      <div className="explore-tabs">
        {categories.map((category) => (
          <button className={active === category ? "active" : ""} key={category} onClick={() => setActive(category)}>
            {category}
          </button>
        ))}
      </div>

      {show("Attractions") && (
        <NearbySection title="Attractions near me">
          {nearby.attractions.map((item) => (
            <NearbyCard key={item.name} item={item} distance={distanceLabel(item.userDistanceKm)}>
              <button className="secondary-btn" onClick={() => openMap(item, "📍", "place")}>Directions</button>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Restaurants") && (
        <NearbySection title="Restaurants near me">
          {nearby.restaurants.map((item) => (
            <NearbyCard key={item.name} item={item} distance={distanceLabel(item.userDistanceKm)}>
              <button className="secondary-btn" onClick={() => {
                setSelectedRestaurant?.({ ...item, cuisine: item.category });
                setTab("restaurant");
              }}>View details</button>
              <a className="secondary-btn" href={directionsUrl(item)} target="_blank" rel="noreferrer">Quick directions</a>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Hotels") && (
        <NearbySection title="Hotels near me">
          {nearby.hotels.map((item) => (
            <NearbyCard key={item.id} item={item} distance={distanceLabel(item.userDistanceKm)}>
              <button className="secondary-btn" onClick={() => openMap(item, "🏨", "hotel")}>View on map</button>
              <a className="secondary-btn" href={directionsUrl(item)} target="_blank" rel="noreferrer">Quick directions</a>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Transportation") && (
        <NearbySection title="Transportation near me">
          {nearby.transportation.map((item) => (
            <NearbyCard key={item.name} item={item} distance={distanceLabel(item.userDistanceKm)}>
              <button className="secondary-btn" onClick={() => openMap(item, item.emoji, "place")}>
                <MapPin size={15} /> Directions
              </button>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function NearbySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="explore-section">
      <h3>{title}</h3>
      <div className="nearby-list">{children}</div>
    </section>
  );
}

function NearbyCard({
  item,
  distance,
  children
}: {
  key?: string;
  item: { name: string; city: string; detail?: string; image?: string };
  distance: string | null;
  children: ReactNode;
}) {
  return (
    <article className="nearby-card">
      {item.image && <img src={item.image} alt={item.name} />}
      <div className="nearby-card-copy">
        <strong>{item.name}</strong>
        <p>{item.city}{distance ? ` · ${distance}` : ""}</p>
        {item.detail && <span>{item.detail}</span>}
      </div>
      <div className="nearby-card-actions">{children}</div>
    </article>
  );
}
