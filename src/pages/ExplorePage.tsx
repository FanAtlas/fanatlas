import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  Archive,
  Coffee,
  Compass,
  ExternalLink,
  Heart,
  Hotel,
  Landmark,
  Map,
  MapPin,
  Search,
  Sparkles,
  Trees,
  Utensils,
  Users,
  X
} from "lucide-react";
import { LegalFooter } from "../components/LegalFooter";
import { useLanguage } from "../LanguageContext";
import { distanceKm, formatDistance } from "../lib/location";
import { languages, text } from "../i18n";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import { ExploreImageCategory, imageForCategory } from "../data/categoryImages";
import { ensureMinimumPlaces } from "../data/globalFallbackContent";
import { fanZones, stadiums as knownStadiums } from "../data/mockData";
import { buildExploreCandidates, candidateOriginalPlace, type ExploreCandidate } from "../lib/exploreCandidates";

type ExploreCopy = typeof text.en;
type ExploreCategory = "Highlights" | "Attractions" | "Restaurants" | "Cafes" | "Stays" | "Parks" | "Museums" | "Family" | "Events";
type ExploreCardCategory = "attraction" | "restaurant" | "hotel";
type SuggestionAction = "map" | "explore" | "restaurants" | "hotels" | "ai" | "guides" | "events" | "external-food";

type ExploreCardData = {
  id: string;
  title: string;
  city: string;
  country: string;
  category: ExploreCardCategory;
  detail: string;
  image: string;
  meta: string;
  sourceLabel: string;
  distance: string | null;
  lat: number;
  lng: number;
  sourcePlace: GlobalPlace;
};

type ExploreSuggestionData = {
  id: string;
  title: string;
  label: string;
  detail: string;
  category: ExploreCardCategory | "event" | "guide";
  action: SuggestionAction;
  image: string;
  city: string;
  country: string;
};

type ExploreImageCardProps = {
  card: ExploreCardData;
  isSaved: boolean;
  key?: string;
  onOpenMap: (card: ExploreCardData) => void;
  onSave: (card: ExploreCardData) => void;
  onViewDetails: (card: ExploreCardData) => void;
  t: ExploreCopy;
};

type ExploreSuggestionCardProps = {
  card: ExploreSuggestionData;
  key?: string;
  onAction: (card: ExploreSuggestionData) => void;
  t: ExploreCopy;
};

const SAVED_EXPLORE_KEY = "fanatlas_saved_explore_cards";

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = (value || "Highlights").toLowerCase();
  if (normalized.includes("restaurant") || normalized.includes("food")) return "Restaurants";
  if (normalized.includes("cafe") || normalized.includes("café")) return "Cafes";
  if (normalized.includes("hotel") || normalized.includes("stay")) return "Stays";
  if (normalized.includes("park")) return "Parks";
  if (normalized.includes("museum")) return "Museums";
  if (normalized.includes("family")) return "Family";
  if (normalized.includes("event") || normalized.includes("match")) return "Events";
  if (normalized.includes("attraction")) return "Attractions";
  return "Highlights";
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
  initialCategory = "Highlights",
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
  const [savedCards, setSavedCards] = useState<string[]>(() => readSavedExploreCards());
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setActive(normalizeCategory(initialCategory)), [initialCategory]);

  useEffect(() => {
    localStorage.setItem(SAVED_EXPLORE_KEY, JSON.stringify(savedCards));
  }, [savedCards]);

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const isEventDestination = useMemo(() => {
    const city = travelLocation.destinationCity.toLowerCase();
    return [...knownStadiums, ...fanZones].some((item) => item.city.toLowerCase().includes(city) || city.includes(item.city.toLowerCase()));
  }, [travelLocation.destinationCity]);

  const exploreCandidates = useMemo(
    () => buildExploreCandidates({
      attractions: groups.attractions,
      restaurants: groups.restaurants,
      hotels: groups.hotels
    }),
    [groups.attractions, groups.hotels, groups.restaurants]
  );

  const allCards = useMemo(() => {
    const attractions = exploreCandidates.verified.filter((candidate) => candidate.category === "attraction");
    const restaurants = exploreCandidates.verified.filter((candidate) => candidate.category === "restaurant");
    const hotels = exploreCandidates.verified.filter((candidate) => candidate.category === "hotel");
    const cards = [
      ...attractions.map((item, index) => placeToCard(item, "attraction", travelLocation, index, t)),
      ...restaurants.map((item, index) => placeToCard(item, "restaurant", travelLocation, index, t)),
      ...hotels.map((item, index) => placeToCard(item, "hotel", travelLocation, index, t))
    ];
    const queryText = query.trim().toLowerCase();
    if (!queryText) return cards;

    return cards.filter((card) =>
      `${card.title} ${card.city} ${card.country} ${card.detail} ${card.meta} ${card.sourceLabel}`.toLowerCase().includes(queryText)
    );
  }, [exploreCandidates.verified, query, travelLocation, t]);

  const suggestions = useMemo(() => {
    const suggestionPlaces = [
      ...ensureMinimumPlaces(travelLocation, groups.attractions, "attraction").filter(isSuggestionPlace).map((item, index) => suggestionFromPlace(item, "attraction", index, t)),
      ...ensureMinimumPlaces(travelLocation, groups.restaurants, "restaurant").filter(isSuggestionPlace).map((item, index) => suggestionFromPlace(item, "restaurant", index, t)),
      ...ensureMinimumPlaces(travelLocation, groups.hotels, "hotel").filter(isSuggestionPlace).map((item, index) => suggestionFromPlace(item, "hotel", index, t))
    ];
    const extraSuggestions = destinationSuggestions(travelLocation, isEventDestination, t);
    const queryText = query.trim().toLowerCase();
    const allSuggestions = [...suggestionPlaces, ...extraSuggestions];
    if (!queryText) return allSuggestions;

    return allSuggestions.filter((item) =>
      `${item.title} ${item.label} ${item.detail} ${item.city} ${item.country}`.toLowerCase().includes(queryText)
    );
  }, [groups.attractions, groups.hotels, groups.restaurants, isEventDestination, query, travelLocation, t]);

  const supportedCategories = useMemo(() => {
    const categoryOrder: ExploreCategory[] = ["Highlights", "Attractions", "Restaurants", "Cafes", "Stays", "Parks", "Museums", "Family"];
    const supported = categoryOrder.filter((category) => {
      if (category === "Highlights") return true;
      return allCards.some((card) => cardMatchesCategory(card, category)) ||
        suggestions.some((suggestion) => suggestionMatchesCategory(suggestion, category));
    });
    if (isEventDestination) supported.push("Events");
    return supported;
  }, [allCards, isEventDestination, suggestions]);

  useEffect(() => {
    if (!supportedCategories.includes(active)) setActive("Highlights");
  }, [active, supportedCategories]);

  const featuredCards = useMemo(() => allCards.slice(0, 6), [allCards]);
  const selectedCards = useMemo(() => {
    if (active === "Highlights") return allCards.slice(0, 12);
    return allCards.filter((card) => cardMatchesCategory(card, active));
  }, [active, allCards]);
  const selectedSuggestions = useMemo(() => {
    const filtered = active === "Highlights"
      ? suggestions
      : suggestions.filter((suggestion) => suggestionMatchesCategory(suggestion, active));
    return filtered.slice(0, active === "Highlights" ? 4 : 6);
  }, [active, suggestions]);
  const verifiedCount = allCards.length;

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
        price: "",
        image: card.image,
        lat: card.lat,
        lng: card.lng,
        phone: card.sourcePlace.phone,
        website: card.sourcePlace.website,
        category: card.sourcePlace.category
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

  function handleSuggestionAction(card: ExploreSuggestionData) {
    if (card.action === "hotels") {
      setTab("hotels");
      return;
    }

    if (card.action === "restaurants") {
      setExploreCategoryAndOpen("Restaurants");
      return;
    }

    if (card.action === "ai") {
      setTab("ai");
      return;
    }

    if (card.action === "guides") {
      setTab("guides");
      return;
    }

    if (card.action === "events") {
      setTab("matches");
      return;
    }

    if (card.action === "map") {
      openMap();
      return;
    }

    setExploreCategoryAndOpen("All");
  }

  function setExploreCategoryAndOpen(category: string) {
    setTab("explore");
    setActive(normalizeCategory(category));
  }

  return (
    <div className="explore-page-v2 explore-discovery-hub fa-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="explore-premium-topbar fa-page-header fa-page-header-sticky">
        <div className="explore-title-lockup">
          <span>{t.exploreTitle}</span>
          <strong>{travelLocation.destinationCity}, {travelLocation.destinationCountry}</strong>
          <small>{travelLocation.locationSource === "fallback" ? t.showingSuggestionsForDestination : t.exploreSubtitle}</small>
        </div>
        <div className="explore-header-actions">
          <button className="explore-map-icon-btn fa-icon-button" type="button" onClick={() => openMap()} aria-label={t.exploreOnMap} title={t.exploreOnMap}>
            <Map size={17} aria-hidden="true" />
          </button>
          <button className="explore-change-btn fa-button-secondary" type="button" onClick={() => setTab("travelLocation")} aria-label={t.changeDestination}>
            {t.changeDestinationShort}
          </button>
          <div className="language-pill" aria-label={t.language}>{languages[language]}</div>
        </div>
      </header>

      <label className="explore-search premium fa-search">
        <Search className="fa-search-icon" size={18} aria-hidden="true" />
        <span className="sr-only">{t.exploreSearchPlaceholder}</span>
        <input
          className="fa-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={t.exploreSearchPlaceholder}
          aria-label={t.exploreSearchPlaceholder}
        />
        {query && (
          <button className="explore-search-clear fa-search-clear" type="button" onClick={() => setQuery("")} aria-label={t.clearSearch} title={t.clearSearch}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </label>

      <div className="explore-tabs premium-tabs fa-chip-scroll" aria-label={t.exploreCategories}>
        {supportedCategories.map((category) => (
          <button
            ref={active === category ? activeChipRef : undefined}
            className={active === category ? "active fa-chip-active" : "fa-chip"}
            key={category}
            onClick={() => setActive(category)}
            type="button"
            aria-pressed={active === category}
          >
            {categoryLabel(category, t)}
          </button>
        ))}
      </div>

      <section className="explore-summary-card fa-summary-card">
        <div>
          <span>{verifiedCount > 0 ? `${verifiedCount} ${t.verifiedNearby}` : t.destinationSuggestion}</span>
          <strong>{t.aroundDestination} {travelLocation.destinationCity}</strong>
          <p>{t.exploreSummaryText}</p>
        </div>
        <button className="explore-summary-action fa-button-secondary" type="button" onClick={() => openMap()} aria-label={t.exploreOnMap}>
          <MapPin size={16} aria-hidden="true" /> {t.exploreOnMap}
        </button>
      </section>

      {loading && (
        <div className="explore-inline-state fa-loading-state" role="status" aria-live="polite">
          {message || `${t.loadingExplore} ${travelLocation.destinationCity}...`}
        </div>
      )}
      {!loading && message && (
        <div className="explore-inline-state fa-inline-message" role="status" aria-live="polite">
          {message.includes("saved") ? t.showingSavedPlaces : t.exploreUnavailable}
          {message.includes("Finding live places") && <button className="places-retry-btn fa-button-secondary" type="button" onClick={refreshPlaces}>{t.retry}</button>}
        </div>
      )}

      {query && selectedCards.length === 0 && selectedSuggestions.length === 0 && (
        <div className="explore-empty-card fa-empty-state">
          <strong>{t.noMatchingPlaces}</strong>
          <button className="fa-button-secondary" type="button" onClick={() => setQuery("")}>{t.clearSearch}</button>
        </div>
      )}

      {featuredCards.length > 0 && active === "Highlights" && !query && (
        <section className="explore-featured-section fa-page-section" aria-labelledby="explore-featured-title">
          <div className="explore-group-heading fa-section-header">
            <div>
              <span>{t.verifiedNearby}</span>
              <h2 id="explore-featured-title" className="fa-section-title">{t.highlights}</h2>
            </div>
            <small>{featuredCards.length} {t.nearby}</small>
          </div>
          <div className="explore-card-rail">
            {featuredCards.map((card) => (
              <ExploreImageCard
                card={card}
                isSaved={savedCards.includes(card.id)}
                key={card.id}
                onOpenMap={openMap}
                onSave={toggleSave}
                onViewDetails={viewDetails}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      {selectedCards.length > 0 && (
        <ExploreSection
          title={active === "Highlights" ? t.placesToExplore : categoryLabel(active, t)}
          count={selectedCards.length}
          icon={categoryIcon(active)}
          t={t}
        >
          {selectedCards.slice(0, active === "Highlights" ? 8 : 16).map((card) => (
            <ExploreImageCard
              card={card}
              isSaved={savedCards.includes(card.id)}
              key={card.id}
              onOpenMap={openMap}
              onSave={toggleSave}
              onViewDetails={viewDetails}
              t={t}
            />
          ))}
        </ExploreSection>
      )}

      {selectedSuggestions.length > 0 && (
        <section className="explore-suggestions-section fa-page-section" aria-labelledby="explore-suggestions-title">
          <div className="explore-group-heading fa-section-header">
            <div>
              <span>{t.exploreSuggestion}</span>
              <h2 id="explore-suggestions-title" className="fa-section-title">{t.suggestionsForDestination} {travelLocation.destinationCity}</h2>
            </div>
          </div>
          <div className="explore-suggestion-grid">
            {selectedSuggestions.map((card) => (
              <ExploreSuggestionCard card={card} key={card.id} onAction={handleSuggestionAction} t={t} />
            ))}
          </div>
        </section>
      )}

      <section className="explore-map-cta fa-card" aria-labelledby="explore-map-cta-title">
        <div>
          <span className="fa-badge">{t.exploreOnMap}</span>
          <h2 id="explore-map-cta-title">{t.openDestinationMap}</h2>
          <p>{t.exploreMapCtaText}</p>
        </div>
        <button className="fa-button-primary" type="button" onClick={() => openMap()}>
          <MapPin size={16} aria-hidden="true" /> {t.exploreOnMap}
        </button>
      </section>

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function ExploreSection({
  title,
  icon,
  count,
  children,
  t
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
  t: ExploreCopy;
}) {
  return (
    <section className="explore-premium-section fa-page-section">
      <div className="explore-section-heading fa-section-header">
        <div>{icon}<h2 className="fa-section-title">{title}</h2></div>
        <span>{count} {t.nearby}</span>
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
  onViewDetails,
  t
}: ExploreImageCardProps) {
  const fallbackImage = imageForCategory(card.category as ExploreImageCategory, 0);
  const [imageSrc, setImageSrc] = useState(card.image || fallbackImage);

  useEffect(() => {
    setImageSrc(card.image || fallbackImage);
  }, [card.image, fallbackImage]);

  function handleSave(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onSave(card);
  }

  function handlePrimaryAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onViewDetails(card);
  }

  function handleMapAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onOpenMap(card);
  }

  function handleImageError() {
    if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
  }

  const actionLabel = card.category === "hotel" ? t.showAllStays : card.category === "restaurant" ? t.viewDetails : t.viewOnMap;

  return (
    <article className="explore-image-card-premium fa-place-card">
      <div className="explore-card-media">
        <img src={imageSrc} alt={card.title} loading="lazy" onError={handleImageError} />
        <button
          className={`explore-save-btn ${isSaved ? "active" : ""}`}
          onClick={handleSave}
          type="button"
          aria-label={isSaved ? `${t.unsave} ${card.title}` : `${t.save} ${card.title}`}
          title={isSaved ? t.saved : t.save}
        >
          <Heart size={15} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <div className="explore-card-body">
        <span className="explore-card-tag fa-badge-success">{card.sourceLabel}</span>
        <h3>{card.title}</h3>
        <p>{card.meta} · {card.city}</p>
        {card.distance && <small>{card.distance}</small>}
      </div>
      <div className="explore-card-actions">
        <button className="explore-card-btn primary" onClick={handlePrimaryAction} type="button">{actionLabel}</button>
        <button className="explore-card-btn icon" onClick={handleMapAction} type="button" aria-label={`${t.viewOnMap}: ${card.title}`} title={t.viewOnMap}>
          <MapPin size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ExploreSuggestionCard({ card, onAction, t }: ExploreSuggestionCardProps) {
  const fallbackImage = imageForSuggestion(card, 1);
  const [imageSrc, setImageSrc] = useState(card.image || fallbackImage);
  const restaurantSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants in ${card.city} ${card.country}`)}`;

  useEffect(() => {
    setImageSrc(card.image || fallbackImage);
  }, [card.image, fallbackImage]);

  function handleImageError() {
    if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
  }

  const actionLabel = suggestionActionLabel(card.action, t);

  return (
    <article className="explore-suggestion-card fa-suggestion-card">
      <img src={imageSrc} alt="" loading="lazy" onError={handleImageError} />
      <div>
        <span className="fa-badge-suggestion">{card.label}</span>
        <strong>{card.title}</strong>
        <small>{card.detail}</small>
      </div>
      {card.action === "external-food" ? (
        <a className="explore-card-btn primary" href={restaurantSearchUrl} target="_blank" rel="noopener noreferrer">
          {actionLabel} <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : (
        <button className="explore-card-btn primary" type="button" onClick={() => onAction(card)}>{actionLabel}</button>
      )}
    </article>
  );
}

function placeToCard(
  item: ExploreCandidate,
  category: ExploreCardCategory,
  travelLocation: { latitude: number; longitude: number },
  index: number,
  t: ExploreCopy
): ExploreCardData {
  const sourcePlace = candidateOriginalPlace(item) || item.original as GlobalPlace;
  const image = item.image || imageForCategory(category as ExploreImageCategory, index);
  const distance = item.hasCoordinates && item.lat !== undefined && item.lng !== undefined
    ? `${formatDistance(distanceKm(travelLocation, { lat: item.lat, lng: item.lng }))} ${t.away}`
    : null;
  return {
    id: item.id,
    title: item.name,
    city: item.city || "",
    country: item.country || "",
    category,
    detail: item.detail || category,
    image,
    meta: placeMeta(item, category, t),
    sourceLabel: item.source === "google_places" ? "Google Places" : "OpenStreetMap",
    distance,
    lat: item.lat || 0,
    lng: item.lng || 0,
    sourcePlace
  };
}

function suggestionFromPlace(item: GlobalPlace, category: ExploreCardCategory, index: number, t: ExploreCopy): ExploreSuggestionData {
  return {
    id: `suggestion-${item.id}`,
    title: item.name,
    label: t.searchSuggestion,
    detail: item.detail,
    category,
    action: category === "hotel" ? "hotels" : category === "restaurant" ? "external-food" : "ai",
    image: imageForCategory(category as ExploreImageCategory, index),
    city: item.city,
    country: item.country
  };
}

function destinationSuggestions(
  travelLocation: { destinationCity: string; destinationCountry: string },
  includeEventArchive: boolean,
  t: ExploreCopy
): ExploreSuggestionData[] {
  const base = [
    {
      id: `destination-map-${travelLocation.destinationCity}`,
      title: t.openDestinationMap,
      label: t.destinationSuggestion,
      detail: t.exploreMapCtaText,
      category: "guide" as const,
      action: "map" as const,
      image: imageForCategory("attraction", 3),
      city: travelLocation.destinationCity,
      country: travelLocation.destinationCountry
    },
    {
      id: `destination-hidden-${travelLocation.destinationCity}`,
      title: t.askAiHiddenPlaces,
      label: t.exploreSuggestion,
      detail: t.askFanAtlasDesc,
      category: "guide" as const,
      action: "ai" as const,
      image: imageForCategory("attraction", 4),
      city: travelLocation.destinationCity,
      country: travelLocation.destinationCountry
    },
    {
      id: `destination-guides-${travelLocation.destinationCity}`,
      title: t.browseTravelGuides,
      label: t.destinationSuggestion,
      detail: t.travelGuidesDesc,
      category: "guide" as const,
      action: "guides" as const,
      image: imageForCategory("attraction", 5),
      city: travelLocation.destinationCity,
      country: travelLocation.destinationCountry
    }
  ];

  if (!includeEventArchive) return base;

  return [
    ...base,
    {
      id: `event-archive-${travelLocation.destinationCity}`,
      title: "World Cup 2026",
      label: t.eventArchive,
      detail: t.worldCupArchiveDesc,
      category: "event" as const,
      action: "events" as const,
      image: imageForCategory("attraction", 2),
      city: travelLocation.destinationCity,
      country: travelLocation.destinationCountry
    }
  ];
}

function categoryIcon(category: ExploreCategory) {
  if (category === "Restaurants") return <Utensils size={18} aria-hidden="true" />;
  if (category === "Cafes") return <Coffee size={18} aria-hidden="true" />;
  if (category === "Stays") return <Hotel size={18} aria-hidden="true" />;
  if (category === "Parks") return <Trees size={18} aria-hidden="true" />;
  if (category === "Museums") return <Landmark size={18} aria-hidden="true" />;
  if (category === "Family") return <Users size={18} aria-hidden="true" />;
  if (category === "Events") return <Archive size={18} aria-hidden="true" />;
  if (category === "Attractions") return <Sparkles size={18} aria-hidden="true" />;
  return <Compass size={18} aria-hidden="true" />;
}

function categoryLabel(category: ExploreCategory, t: ExploreCopy) {
  if (category === "Highlights") return t.highlights;
  if (category === "Restaurants") return t.restaurants;
  if (category === "Cafes") return t.cafes;
  if (category === "Stays") return t.stays;
  if (category === "Parks") return t.parks;
  if (category === "Museums") return t.museums;
  if (category === "Family") return t.familyActivities;
  if (category === "Events") return t.events;
  return t.attractions;
}

function placeMeta(place: Pick<ExploreCandidate, "detail">, category: ExploreCardCategory, t: ExploreCopy) {
  const detail = place.detail?.trim();
  if (detail && detail !== category) return detail;
  if (category === "restaurant") return t.restaurants;
  if (category === "hotel") return t.stays;
  return t.attractions;
}

function cardMatchesCategory(card: ExploreCardData, category: ExploreCategory) {
  const detail = `${card.detail} ${card.meta} ${card.title}`.toLowerCase();
  if (category === "Highlights") return true;
  if (category === "Restaurants") return card.category === "restaurant";
  if (category === "Cafes") return detail.includes("cafe") || detail.includes("café");
  if (category === "Stays") return card.category === "hotel";
  if (category === "Parks") return detail.includes("park") || detail.includes("waterfront");
  if (category === "Museums") return detail.includes("museum");
  if (category === "Family") return detail.includes("family");
  if (category === "Events") return false;
  return card.category === "attraction";
}

function suggestionMatchesCategory(card: ExploreSuggestionData, category: ExploreCategory) {
  const detail = `${card.detail} ${card.title}`.toLowerCase();
  if (category === "Highlights") return true;
  if (category === "Restaurants") return card.category === "restaurant";
  if (category === "Cafes") return detail.includes("cafe") || detail.includes("café");
  if (category === "Stays") return card.category === "hotel";
  if (category === "Parks") return detail.includes("park") || detail.includes("waterfront");
  if (category === "Museums") return detail.includes("museum");
  if (category === "Family") return detail.includes("family");
  if (category === "Events") return card.category === "event";
  return card.category === "attraction";
}

function categoryToGlobalCategory(category: ExploreCardCategory): GlobalPlace["category"] {
  if (category === "hotel") return "hotel";
  if (category === "restaurant") return "restaurant";
  return "attraction";
}

function imageForSuggestion(card: ExploreSuggestionData, index: number) {
  if (card.category === "hotel") return imageForCategory("hotel", index);
  if (card.category === "restaurant") return imageForCategory("restaurant", index);
  return imageForCategory("attraction", index);
}

function isSuggestionPlace(place: GlobalPlace) {
  return place.source === "fallback";
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
    safetyNotes: card.sourcePlace.source === "openstreetmap"
      ? "OpenStreetMap community place data. Verify details before travel."
      : "Open Map for nearby places."
  };
}

function suggestionActionLabel(action: SuggestionAction, t: ExploreCopy) {
  if (action === "hotels") return t.showAllStays;
  if (action === "restaurants" || action === "external-food") return t.showAllRestaurants;
  if (action === "ai") return t.askFanAtlas;
  if (action === "guides") return t.travelGuides;
  if (action === "events") return t.openMatchCenter;
  if (action === "map") return t.exploreOnMap;
  return t.explore;
}
