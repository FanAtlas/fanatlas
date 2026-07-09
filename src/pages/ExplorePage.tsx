import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Heart, Hotel, MapPin, Search, Sparkles, Utensils } from "lucide-react";
import { LegalFooter } from "../components/LegalFooter";
import { useLanguage } from "../LanguageContext";
import { distanceKm, formatDistance } from "../lib/location";
import { languages } from "../i18n";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import { ExploreImageCategory, imageForCategory } from "../data/categoryImages";

type ExploreCategory = "All" | "Attractions" | "Restaurants" | "Hotels";
type ExploreCardCategory = "attraction" | "restaurant" | "hotel";

type ExploreCardData = {
  id: string;
  title: string;
  city: string;
  country: string;
  category: ExploreCardCategory;
  detail: string;
  image: string;
  rating: string;
  distance: string | null;
  lat: number;
  lng: number;
  sourcePlace?: GlobalPlace;
};

type ExploreImageCardProps = {
  card: ExploreCardData;
  isSaved: boolean;
  key?: string;
  onOpenMap: (card: ExploreCardData) => void;
  onSave: (card: ExploreCardData) => void;
  onViewDetails: (card: ExploreCardData) => void;
};

const categories: ExploreCategory[] = ["All", "Attractions", "Restaurants", "Hotels"];
const SAVED_EXPLORE_KEY = "fanatlas_saved_explore_cards";

const fallbackCards: Record<ExploreCardCategory, Array<{ title: string; detail: string; rating: string }>> = {
  attraction: [
    { title: "Explore landmarks nearby", detail: "Open destination map", rating: "Trip starter" },
    { title: "Open destination map", detail: "Find top places around your city", rating: "Map ready" },
    { title: "Ask AI for top attractions", detail: "Get ideas for your travel style", rating: "AI picks" }
  ],
  restaurant: [
    { title: "Find restaurants near you", detail: "Search food around your destination", rating: "Food nearby" },
    { title: "Search local food spots", detail: "Cafes, restaurants, and quick bites", rating: "Local food" },
    { title: "Ask AI for food recommendations", detail: "Plan meals by budget and location", rating: "AI food guide" }
  ],
  hotel: [
    { title: "Search hotels near destination", detail: "Compare stays around your city", rating: "Stay search" },
    { title: "Save preferred stay area", detail: "Keep hotel neighborhoods organized", rating: "Trip planning" },
    { title: "Ask AI where to stay", detail: "Choose areas by safety and convenience", rating: "AI stay guide" }
  ]
};

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = (value || "All").toLowerCase();
  if (normalized.includes("restaurant") || normalized.includes("food")) return "Restaurants";
  if (normalized.includes("hotel") || normalized.includes("stay")) return "Hotels";
  if (normalized.includes("attraction")) return "Attractions";
  return "All";
}

function readSavedExploreCards() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_EXPLORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
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
  const { language } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const { groups, loading, message, refreshPlaces } = useGlobalPlaces();
  const [active, setActive] = useState<ExploreCategory>(() => normalizeCategory(initialCategory));
  const [query, setQuery] = useState("");
  const [savedCards, setSavedCards] = useState<string[]>(() => readSavedExploreCards());

  useEffect(() => setActive(normalizeCategory(initialCategory)), [initialCategory]);

  useEffect(() => {
    localStorage.setItem(SAVED_EXPLORE_KEY, JSON.stringify(savedCards));
  }, [savedCards]);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const toCards = (items: GlobalPlace[], category: ExploreCardCategory) =>
      items.map((item, index) => placeToCard(item, category, formatDistance(distanceKm(travelLocation, item)), index));

    const realCards = {
      attractions: toCards(groups.attractions, "attraction"),
      restaurants: toCards(groups.restaurants, "restaurant"),
      hotels: toCards(groups.hotels, "hotel")
    };

    const withFallback = {
      attractions: realCards.attractions.length ? realCards.attractions : makeFallbackCards("attraction", travelLocation),
      restaurants: realCards.restaurants.length ? realCards.restaurants : makeFallbackCards("restaurant", travelLocation),
      hotels: realCards.hotels.length ? realCards.hotels : makeFallbackCards("hotel", travelLocation)
    };

    if (!q) return withFallback;

    const filter = (items: ExploreCardData[]) =>
      items.filter((item) => `${item.title} ${item.city} ${item.country} ${item.detail}`.toLowerCase().includes(q));

    return {
      attractions: filter(withFallback.attractions),
      restaurants: filter(withFallback.restaurants),
      hotels: filter(withFallback.hotels)
    };
  }, [groups.attractions, groups.hotels, groups.restaurants, query, travelLocation]);

  const show = (category: ExploreCategory) => active === "All" || active === category;

  function openMap(card?: ExploreCardData) {
    setMapDestination(card ? cardToDestination(card) : null);
    setTab("map");
  }

  function viewDetails(card: ExploreCardData) {
    if (card.category === "restaurant") {
      setSelectedRestaurant?.({
        name: card.title,
        city: card.city,
        country: card.country,
        cuisine: card.detail,
        rating: 4.5,
        price: "",
        image: card.image,
        lat: card.lat,
        lng: card.lng
      });
      setTab("restaurant");
      return;
    }

    if (card.category === "hotel") {
      setTab("hotels");
      return;
    }

    openMap(card);
  }

  function toggleSave(card: ExploreCardData) {
    setSavedCards((current) => current.includes(card.id)
      ? current.filter((id) => id !== card.id)
      : [...current, card.id]
    );
  }

  return (
    <div className="explore-page-v2" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">Explore <span>{travelLocation.destinationCity}</span></div>
          <div className="subtle">Discover attractions, restaurants, and hotels near your destination.</div>
        </div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <section className="explore-hero-card">
        <span>{travelLocation.destinationCity}, {travelLocation.destinationCountry}</span>
        <h1>Top places selected for your trip.</h1>
        <p>Browse destination-aware ideas, save places, and open the map when you are ready to explore.</p>
        <button className="primary-btn" onClick={() => openMap()}>Open Map</button>
      </section>

      <label className="explore-search premium">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search attractions, restaurants, hotels..." />
      </label>

      {loading && <div className="location-fallback">{message || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
      {!loading && message && (
        <div className="location-fallback">
          {message}
          {message.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      <div className="explore-tabs premium-tabs">
        {categories.map((category) => (
          <button className={active === category ? "active" : ""} key={category} onClick={() => setActive(category)}>
            {category}
          </button>
        ))}
      </div>

      {show("Attractions") && (
        <ExploreSection title="Attractions" icon={<Sparkles size={18} />} cards={cards.attractions}>
          {cards.attractions.map((card) => (
            <ExploreImageCard
              card={card}
              isSaved={savedCards.includes(card.id)}
              key={card.id}
              onOpenMap={openMap}
              onSave={toggleSave}
              onViewDetails={viewDetails}
            />
          ))}
        </ExploreSection>
      )}

      {show("Restaurants") && (
        <ExploreSection title="Restaurants" icon={<Utensils size={18} />} cards={cards.restaurants}>
          {cards.restaurants.map((card) => (
            <ExploreImageCard
              card={card}
              isSaved={savedCards.includes(card.id)}
              key={card.id}
              onOpenMap={openMap}
              onSave={toggleSave}
              onViewDetails={viewDetails}
            />
          ))}
        </ExploreSection>
      )}

      {show("Hotels") && (
        <ExploreSection title="Hotels" icon={<Hotel size={18} />} cards={cards.hotels}>
          {cards.hotels.map((card) => (
            <ExploreImageCard
              card={card}
              isSaved={savedCards.includes(card.id)}
              key={card.id}
              onOpenMap={openMap}
              onSave={toggleSave}
              onViewDetails={viewDetails}
            />
          ))}
        </ExploreSection>
      )}

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function ExploreSection({
  title,
  icon,
  cards,
  children
}: {
  title: string;
  icon: ReactNode;
  cards: ExploreCardData[];
  children: ReactNode;
}) {
  return (
    <section className="explore-premium-section">
      <div className="explore-section-heading">
        <div>{icon}<h3>{title}</h3></div>
        <span>{cards.length} picks</span>
      </div>
      <div className="explore-card-rail">{children}</div>
    </section>
  );
}

function ExploreImageCard({
  card,
  isSaved,
  onOpenMap,
  onSave,
  onViewDetails
}: ExploreImageCardProps) {
  return (
    <article className="explore-image-card-premium">
      <img src={card.image} alt={card.title} loading="lazy" />
      <div className="explore-card-body">
        <span className="explore-card-tag">{placeEmoji(categoryToGlobalCategory(card.category))} {card.rating}</span>
        <h3>{card.title}</h3>
        <p>{card.city}, {card.country}</p>
        <small>{card.distance || card.detail}</small>
      </div>
      <div className="explore-card-actions">
        <button className={`explore-save-btn ${isSaved ? "active" : ""}`} onClick={() => onSave(card)}>
          <Heart size={15} fill={isSaved ? "currentColor" : "none"} /> Save
        </button>
        <button className="explore-card-btn" onClick={() => onViewDetails(card)}>View details</button>
        <button className="explore-card-btn" onClick={() => onOpenMap(card)}><MapPin size={15} /> Open Map</button>
      </div>
    </article>
  );
}

function placeToCard(item: GlobalPlace, category: ExploreCardCategory, distance: string, index: number): ExploreCardData {
  const image = (item as GlobalPlace & { image?: string }).image || imageForCategory(category as ExploreImageCategory, index);

  return {
    id: item.id,
    title: item.name,
    city: item.city,
    country: item.country,
    category,
    detail: item.detail,
    image,
    rating: item.source === "fallback" ? "Trip starter" : item.detail || "Nearby",
    distance: `${distance} away`,
    lat: item.lat,
    lng: item.lng,
    sourcePlace: item
  };
}

function makeFallbackCards(category: ExploreCardCategory, travelLocation: {
  destinationCity: string;
  destinationCountry: string;
  latitude: number;
  longitude: number;
}): ExploreCardData[] {
  return fallbackCards[category].map((item, index) => ({
    id: `explore-fallback-${category}-${index}-${travelLocation.destinationCity}`,
    title: item.title,
    city: travelLocation.destinationCity,
    country: travelLocation.destinationCountry,
    category,
    detail: item.detail,
    image: imageForCategory(category, index),
    rating: item.rating,
    distance: null,
    lat: travelLocation.latitude + index * 0.004,
    lng: travelLocation.longitude + index * 0.004
  }));
}

function categoryToGlobalCategory(category: ExploreCardCategory): GlobalPlace["category"] {
  if (category === "hotel") return "hotel";
  if (category === "restaurant") return "restaurant";
  return "attraction";
}

function cardToDestination(card: ExploreCardData): MapDestination {
  return {
    name: card.title,
    city: card.city,
    lat: card.lat,
    lng: card.lng,
    emoji: placeEmoji(categoryToGlobalCategory(card.category)),
    type: card.category === "restaurant" ? "restaurant" :
      card.category === "hotel" ? "hotel" :
      "place",
    openingHours: card.detail,
    safetyNotes: card.sourcePlace?.source === "openstreetmap"
      ? "OpenStreetMap community place data. Verify details before travel."
      : "Starter travel card. Open Map for nearby live places."
  };
}
