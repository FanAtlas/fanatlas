import { ReactNode, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { LegalFooter } from "../components/LegalFooter";
import { useLanguage } from "../LanguageContext";
import { directionsUrl, distanceKm, formatDistance } from "../lib/location";
import { languages } from "../i18n";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";

type ExploreCategory = "All" | "Attractions" | "Restaurants" | "Hotels" | "Transportation";

const categories: ExploreCategory[] = ["All", "Attractions", "Restaurants", "Hotels", "Transportation"];

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
  const { travelLocation } = useTravelLocation();
  const { groups, loading, message, refreshPlaces } = useGlobalPlaces();
  const [active, setActive] = useState<ExploreCategory>(() => normalizeCategory(initialCategory));
  const [query, setQuery] = useState("");

  useEffect(() => setActive(normalizeCategory(initialCategory)), [initialCategory]);

  const filterPlaces = (items: GlobalPlace[]) => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => !q || `${item.name} ${item.city} ${item.detail}`.toLowerCase().includes(q));
  };

  const show = (category: ExploreCategory) => active === "All" || active === category;
  const distanceLabel = (item: GlobalPlace) => `${formatDistance(distanceKm(travelLocation, item))} away`;

  function openMap(item: GlobalPlace) {
    setMapDestination(globalPlaceDestination(item));
    setTab("map");
  }

  return (
    <div className="explore-page-v2" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">Explore <span>Near Me</span></div>
          <div className="subtle">{travelLocation.destinationCity}, {travelLocation.destinationCountry}</div>
        </div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <button className="travel-location-pill" onClick={() => setTab("travelLocation")}>
        <span>Traveling to: {travelLocation.destinationCity}, {travelLocation.destinationCountry}</span>
        <strong>Change</strong>
      </button>

      <label className="explore-search">
        <input className="fan-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nearby places" />
      </label>

      {loading && <div className="location-fallback">{message || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
      {!loading && message && (
        <div className="location-fallback">
          {message}
          {message.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      <div className="explore-tabs">
        {categories.map((category) => (
          <button className={active === category ? "active" : ""} key={category} onClick={() => setActive(category)}>
            {category}
          </button>
        ))}
      </div>

      {show("Attractions") && (
        <NearbySection title={`Attractions in ${travelLocation.destinationCity}`}>
          {filterPlaces(groups.attractions).length === 0 && <EmptyCityContent city={travelLocation.destinationCity} onRetry={refreshPlaces} />}
          {filterPlaces(groups.attractions).map((item) => (
            <NearbyCard key={item.id} item={item} distance={distanceLabel(item)}>
              <button className="secondary-btn" onClick={() => openMap(item)}>Directions</button>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Restaurants") && (
        <NearbySection title={`Restaurants in ${travelLocation.destinationCity}`}>
          {filterPlaces(groups.restaurants).length === 0 && <EmptyCityContent city={travelLocation.destinationCity} onRetry={refreshPlaces} />}
          {filterPlaces(groups.restaurants).map((item) => (
            <NearbyCard key={item.id} item={item} distance={distanceLabel(item)}>
              <button className="secondary-btn" onClick={() => {
                setSelectedRestaurant?.({ ...item, cuisine: item.detail, rating: 4.5, price: "" });
                setTab("restaurant");
              }}>View details</button>
              <a className="secondary-btn" href={directionsUrl(item)} target="_blank" rel="noreferrer">Quick directions</a>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Hotels") && (
        <NearbySection title={`Hotels in ${travelLocation.destinationCity}`}>
          {filterPlaces(groups.hotels).length === 0 && <EmptyCityContent city={travelLocation.destinationCity} onRetry={refreshPlaces} />}
          {filterPlaces(groups.hotels).map((item) => (
            <NearbyCard key={item.id} item={item} distance={distanceLabel(item)}>
              <button className="secondary-btn" onClick={() => openMap(item)}>View on map</button>
              <a className="secondary-btn" href={directionsUrl(item)} target="_blank" rel="noreferrer">Quick directions</a>
            </NearbyCard>
          ))}
        </NearbySection>
      )}

      {show("Transportation") && (
        <NearbySection title={`Transportation in ${travelLocation.destinationCity}`}>
          {filterPlaces(groups.transport).length === 0 && <EmptyCityContent city={travelLocation.destinationCity} onRetry={refreshPlaces} />}
          {filterPlaces(groups.transport).map((item) => (
            <NearbyCard key={item.id} item={item} distance={distanceLabel(item)}>
              <button className="secondary-btn" onClick={() => openMap(item)}>
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

function EmptyCityContent({ city, onRetry }: { city: string; onRetry?: () => void }) {
  return (
    <div className="card-dark">
      <strong>{city} travel tools are ready.</strong>
      <p className="subtle">Open Map, SOS, hotels, restaurants, or the AI Travel Assistant while live places refresh.</p>
      {onRetry && <button className="places-retry-btn" onClick={onRetry}>Try Again</button>}
    </div>
  );
}

function NearbyCard({
  item,
  distance,
  children
}: {
  key?: string;
  item: GlobalPlace;
  distance: string | null;
  children: ReactNode;
}) {
  return (
    <article className="nearby-card">
      <div className="nearby-card-copy">
        <strong>{placeEmoji(item.category)} {item.name}</strong>
        <p>{item.city}{distance ? ` · ${distance}` : ""}</p>
        {item.detail && <span>{item.detail}</span>}
      </div>
      <div className="nearby-card-actions">{children}</div>
    </article>
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
    safetyNotes: "OpenStreetMap community place data. Verify critical details before travel."
  };
}
