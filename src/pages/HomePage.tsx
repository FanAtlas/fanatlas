import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  Compass,
  Hotel,
  Languages,
  LifeBuoy,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  X
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { LegalFooter } from "../components/LegalFooter";
import { fanZones, places, stadiums as knownStadiums } from "../data/mockData";
import { Language } from "../i18n";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, MapDestination } from "../mapDestinations";
import { InstallBanner } from "./InstallBanner";
import { distanceKm, formatDistance } from "../lib/location";
import { destinations } from "../data/destinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import { countryFlag } from "../data/countries";
import { ExploreImageCategory, imageForCategory } from "../data/categoryImages";

type HomePlaceCard = {
  id: string;
  title: string;
  category: "attraction" | "restaurant" | "hotel";
  badge: string;
  image: string;
  sourceLabel: string;
  action: string;
  distance?: string;
  place?: GlobalPlace;
  isVerified: boolean;
};

type HomeSearchResult = {
  type: string;
  label: string;
  name: string;
  city: string;
  item?: GlobalPlace | Record<string, unknown>;
};

type HomeCopy = typeof import("../i18n").text.en;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const message = sessionStorage.getItem("fanatlas_travel_toast");
    if (!message) return;

    setToast(message);
    sessionStorage.removeItem("fanatlas_travel_toast");
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  const isEventDestination = useMemo(() => {
    const city = travelLocation.destinationCity.toLowerCase();
    return [...knownStadiums, ...fanZones].some((item) => item.city.toLowerCase().includes(city) || city.includes(item.city.toLowerCase()));
  }, [travelLocation.destinationCity]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as HomeSearchResult[];

    const hotels = [
      { name: "Marriott Times Square", city: "New York" },
      { name: "Ibis Mexico City", city: "Mexico City" },
      { name: "Delta Hotels Toronto", city: "Toronto" }
    ];
    const cities = destinations.map((destination) => `${destination.city}, ${destination.country}`);
    const results: HomeSearchResult[] = [
      ...knownStadiums.map((item) => ({ type: "stadium", label: t.stadiumArchive, name: item.name, city: item.city })),
      ...places.map((item) => ({ type: "restaurant", label: t.restaurantSuggestion, name: item.name, city: item.city, item })),
      ...fanZones.map((item) => ({ type: "fan-zone", label: t.fanZoneArchive, name: item.name, city: item.city })),
      ...[...groups.hotels, ...groups.restaurants, ...groups.attractions].map((item) => ({
        type: item.category,
        label: isVerifiedPlace(item) ? t.nearbyPlace : t.searchSuggestion,
        name: item.name,
        city: item.city,
        item
      })),
      ...hotels.map((item) => ({ type: "hotel", label: t.hotelSearch, name: item.name, city: item.city })),
      ...cities.map((city) => ({ type: "city", label: t.destinationResult, name: city, city }))
    ];

    return results
      .filter((item) => `${item.name} ${item.city} ${item.type} ${item.label}`.toLowerCase().includes(query))
      .slice(0, 7);
  }, [groups.attractions, groups.hotels, groups.restaurants, searchQuery, t]);

  const primaryActions = [
    { label: t.explore, icon: Compass, tab: "explore" as Tab, ariaLabel: t.openExplore },
    { label: t.map, icon: MapPin, tab: "map" as Tab, ariaLabel: t.openMap },
    { label: t.hotels, icon: Hotel, tab: "hotels" as Tab, ariaLabel: t.openHotels },
    { label: t.sos, icon: Shield, tab: "sos" as Tab, ariaLabel: t.openSos }
  ];
  const secondaryActions = [
    { label: t.restaurants, icon: Utensils, tab: "explore" as Tab, category: "Restaurants", ariaLabel: t.showAllRestaurants },
    { label: t.travelTools, icon: Wrench, tab: "traveltools" as Tab, ariaLabel: t.travelTools },
    { label: t.aiChat, icon: Bot, tab: "ai" as Tab, ariaLabel: t.openAiAssistant }
  ];
  const travelTools = [
    { label: t.translate, icon: Languages, tab: "translator" as Tab },
    { label: t.currency, icon: Wallet, tab: "currency" as Tab },
    { label: t.esim, icon: Wifi, tab: "esim" as Tab },
    { label: t.offline, icon: MapPin, tab: "offline" as Tab },
    { label: t.travelGuides, icon: Compass, tab: "guides" as Tab },
    { label: t.events, icon: CalendarDays, tab: "matches" as Tab }
  ];
  const homeCards = useMemo(() => ({
    attractions: buildHomeCards(groups.attractions, "attraction", travelLocation, t),
    restaurants: buildHomeCards(groups.restaurants, "restaurant", travelLocation, t),
    hotels: buildHomeCards(groups.hotels, "hotel", travelLocation, t)
  }), [groups.attractions, groups.hotels, groups.restaurants, travelLocation, t]);
  const verifiedCounts = {
    attractions: homeCards.attractions.filter((card) => card.isVerified).length,
    restaurants: homeCards.restaurants.filter((card) => card.isVerified).length,
    hotels: homeCards.hotels.filter((card) => card.isVerified).length
  };

  return (
    <div className="home-compact-page home-dashboard fa-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <InstallBanner />

      <header className="home-dashboard-header fa-page-header fa-page-header-sticky">
        <div className="home-header-main">
          <div>
            <div className="brand">FanAtlas</div>
            <div className="subtle">{t.homeBrandSubtitle}</div>
          </div>

          <button className="home-destination-control" type="button" onClick={() => setTab("travelLocation")} aria-label={t.changeDestination}>
            <span>{travelLocation.locationSource === "fallback" ? t.suggestedDestination : t.travelingTo}</span>
            <strong>{countryFlag(travelLocation.destinationCountry)} {travelLocation.destinationCity}</strong>
            <small>{travelLocation.destinationCountry}</small>
          </button>
        </div>

        <select
          className="language-pill"
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
          aria-label={t.language}
        >
          <option value="en">🇺🇸 English</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="es">🇪🇸 Español</option>
          <option value="ar">🇲🇦 العربية</option>
          <option value="pt">🇵🇹 Português</option>
        </select>
      </header>

      {toast && <div className="travel-toast" role="status" aria-live="polite">{toast}</div>}

      {travelLocation.locationSource === "fallback" && (
        <div className="location-fallback fa-inline-message" role="status">
          <strong>{t.suggestedDestinationNotice}</strong>
          <button className="fa-button-secondary" type="button" onClick={() => setTab("travelLocation")}>{t.changeDestination}</button>
        </div>
      )}

      <label className="home-search-shell fa-search">
        <Search className="fa-search-icon" size={18} aria-hidden="true" />
        <span className="sr-only">{t.search}</span>
        <input
          className="fan-input fa-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchQuery("");
          }}
          placeholder={t.homeSearchPlaceholder}
          aria-label={t.homeSearchPlaceholder}
        />
        {searchQuery.trim() && (
          <button className="home-search-clear fa-search-clear" type="button" onClick={() => setSearchQuery("")} aria-label={t.clearSearch}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </label>

      {searchQuery.trim() && (
        <div className="home-search-results" role="list" aria-live="polite">
          {searchResults.length === 0 && <div className="home-search-empty fa-empty-state">{t.noSearchResults}</div>}
          {searchResults.map((result) => (
            <button
              className="fan-list-item"
              key={`${result.type}-${result.name}`}
              type="button"
              onClick={() => openSearchResult(result, setMapDestination, setSelectedRestaurant, setExploreCategory, setTab)}
            >
              <span className="home-search-type">{result.label}</span>
              <strong>{result.name}</strong>
              <small>{result.city}</small>
            </button>
          ))}
        </div>
      )}

      <section className="home-primary-actions" aria-labelledby="home-primary-actions-title">
        <div className="home-section-heading fa-section-header">
          <div>
            <span>{t.fastActions}</span>
            <h1 id="home-primary-actions-title" className="fa-section-title">{travelLocation.destinationCity}</h1>
          </div>
        </div>
        <div className="home-primary-action-grid">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                className="home-primary-action-card fa-card-compact fa-card-interactive"
                key={action.label}
                type="button"
                aria-label={action.ariaLabel}
                onClick={() => {
                  if (action.tab === "map") setMapDestination(null);
                  if (action.tab === "explore") setExploreCategory("All");
                  setTab(action.tab);
                }}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
        <div className="home-secondary-actions" aria-label={t.secondaryTools}>
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                className="home-secondary-action fa-button-ghost"
                key={action.label}
                type="button"
                aria-label={action.ariaLabel}
                onClick={() => {
                  if (action.category) setExploreCategory(action.category);
                  setTab(action.tab);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-travel-picks" aria-label={t.nearbyHighlights}>
        <div className="home-section-heading fa-section-header">
          <div>
            <span>{t.verifiedNearby}</span>
            <h2 className="fa-section-title">{t.nearbyHighlights}</h2>
          </div>
          {placesLoading && <em role="status" aria-live="polite">{t.refreshingLocalPlaces}</em>}
        </div>

        {!placesLoading && placesMessage && (
          <div className="home-refresh-pill" role="status" aria-live="polite">
            {placesMessage.includes("saved") ? t.showingSavedPlaces : t.nearbyUnavailable}
            {placesMessage.includes("Finding live places") && <button type="button" onClick={refreshPlaces}>{t.refresh}</button>}
          </div>
        )}

        <HomeCardSection
          title={t.nearbyHighlights}
          count={`${verifiedCounts.attractions} ${t.nearby}`}
          cards={homeCards.attractions}
          emptyText={t.noVerifiedNearby}
          suggestionTitle={`${t.suggestionsForDestination} ${travelLocation.destinationCity}`}
          seeAllLabel={t.seeAll}
          onSeeAll={() => {
            setExploreCategory("Attractions");
            setTab("explore");
          }}
          onOpen={(card) => openHomeCard(card, setMapDestination, setSelectedRestaurant, setExploreCategory, setTab)}
        />
      </section>

      <HomeCardSection
        title={t.eatNearby}
        count={`${verifiedCounts.restaurants} ${t.nearby}`}
        cards={homeCards.restaurants}
        emptyText={t.noVerifiedRestaurants}
        suggestionTitle={`${t.suggestionsForDestination} ${travelLocation.destinationCity}`}
        seeAllLabel={t.showAllRestaurants}
        onSeeAll={() => {
          setExploreCategory("Restaurants");
          setTab("explore");
        }}
        onOpen={(card) => openHomeCard(card, setMapDestination, setSelectedRestaurant, setExploreCategory, setTab)}
      />

      <HomeCardSection
        title={t.stayNearby}
        count={`${verifiedCounts.hotels} ${t.nearby}`}
        cards={homeCards.hotels}
        emptyText={t.noVerifiedHotels}
        suggestionTitle={t.staySearchSuggestions}
        seeAllLabel={t.showAllStays}
        onSeeAll={() => setTab("hotels")}
        onOpen={(card) => openHomeCard(card, setMapDestination, setSelectedRestaurant, setExploreCategory, setTab)}
      />

      <section className="home-safety-card fa-card" aria-labelledby="home-safety-title">
        <div>
          <span className="fa-badge-warning">{t.essentialHelp}</span>
          <h2 id="home-safety-title">{t.travelSafely} {travelLocation.destinationCountry}</h2>
          <p>{t.travelSafelyDesc}</p>
        </div>
        <button className="home-sos-button fa-button-danger" type="button" onClick={() => setTab("sos")} aria-label={t.openSos}>
          <LifeBuoy size={18} aria-hidden="true" />
          {t.sosEmergency}
        </button>
      </section>

      <section className="home-tools-section" aria-labelledby="home-tools-title">
        <div className="home-section-heading fa-section-header">
          <div>
            <span>{t.travelEssentials}</span>
            <h2 id="home-tools-title" className="fa-section-title">{t.usefulTravelTools}</h2>
          </div>
        </div>
        <div className="home-tools-grid">
          {travelTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                className="home-tool-card fa-card-compact fa-card-interactive"
                key={tool.label}
                type="button"
                onClick={() => {
                  if (tool.tab === "offline") setMapDestination(null);
                  setTab(tool.tab);
                }}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-ai-card fa-summary-card" aria-labelledby="home-ai-title">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <span className="fa-badge">{t.askFanAtlas}</span>
          <h2 id="home-ai-title">{t.askFanAtlas}</h2>
          <p>{t.askFanAtlasDesc}</p>
        </div>
        <button className="fa-button-primary" type="button" onClick={() => setTab("ai")} aria-label={t.openAiAssistant}>
          {t.openAiAssistant}
        </button>
      </section>

      {isEventDestination && (
        <section className="home-events-archive-card fa-card" aria-labelledby="home-events-title">
          <div className="section-row">
            <div>
              <span>{t.eventsArchive}</span>
              <h2 id="home-events-title">World Cup 2026</h2>
            </div>
            <Trophy size={22} aria-hidden="true" />
          </div>

          <div className="events-archive-mini-grid">
            <div>
              <span>Status</span>
              <strong>{t.completedEvent}</strong>
              <p>{t.worldCupArchiveDesc}</p>
            </div>
            <div>
              <span>Stadiums</span>
              <strong>Host venue archive</strong>
            </div>
            <div>
              <span>Fan Zones</span>
              <strong>Past city events</strong>
            </div>
          </div>

          <button className="fa-button-secondary full-width" type="button" onClick={() => setTab("matches")} aria-label={t.openMatchCenter}>
            {t.openMatchCenter}
          </button>
        </section>
      )}

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function openSearchResult(
  result: HomeSearchResult,
  setMapDestination: (destination: MapDestination | null) => void,
  setSelectedRestaurant: (restaurant: any) => void,
  setExploreCategory: (category: string) => void,
  setTab: (tab: Tab) => void
) {
  if (result.type === "restaurant" && result.item) {
    const item = result.item as any;
    setSelectedRestaurant(item.category
      ? {
        ...item,
        cuisine: item.detail,
        price: "",
        image: item.image || imageForCategory("restaurant", 0)
      }
      : item
    );
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

  if (result.item && "category" in result.item) {
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

function buildHomeCards(
  places: GlobalPlace[],
  category: HomePlaceCard["category"],
  travelLocation: { destinationCity: string; destinationCountry: string; latitude: number; longitude: number },
  t: HomeCopy
): HomePlaceCard[] {
  const verifiedCards = places.filter(isVerifiedPlace).slice(0, 4).map((place, index) => ({
    id: place.id,
    title: place.name,
    category,
    badge: categoryLabel(category, t),
    distance: `${formatDistance(distanceKm(travelLocation, place))}`,
    image: (place as GlobalPlace & { image?: string }).image || imageForCategory(category as ExploreImageCategory, index),
    place,
    isVerified: true,
    sourceLabel: place.source === "google_places" ? "Google Places" : "OpenStreetMap",
    action: category === "restaurant" ? t.viewDetails : category === "hotel" ? t.showAllStays : t.openMap
  }));

  const fallbackCards = fallbackCardsForCategory(category, t).slice(0, verifiedCards.length > 0 ? 2 : 3).map((item, index) => ({
    id: `home-fallback-${category}-${index}-${travelLocation.destinationCity}`,
    title: item.title,
    category,
    badge: item.badge,
    image: imageForCategory(category as ExploreImageCategory, index),
    isVerified: false,
    sourceLabel: t.searchSuggestion,
    action: item.action
  }));

  return [...verifiedCards, ...fallbackCards];
}

function isVerifiedPlace(place: GlobalPlace) {
  return (place.source === "google_places" || place.source === "openstreetmap") &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng);
}

function fallbackCardsForCategory(category: HomePlaceCard["category"], t: HomeCopy) {
  if (category === "restaurant") {
    return [
      { title: t.findRestaurantsNearby, badge: t.searchSuggestion, action: t.showAllRestaurants },
      { title: t.searchLocalFood, badge: t.destinationSuggestion, action: t.showAllRestaurants },
      { title: t.askAiFood, badge: t.aiSuggestion, action: t.askFanAtlas }
    ];
  }

  if (category === "hotel") {
    return [
      { title: t.searchHotelsDestination, badge: t.hotelSearch, action: t.showAllStays },
      { title: t.compareStayAreas, badge: t.stayPlanning, action: t.showAllStays },
      { title: t.askAiStays, badge: t.aiSuggestion, action: t.askFanAtlas }
    ];
  }

  return [
    { title: t.exploreLandmarksNearby, badge: t.searchSuggestion, action: t.openExplore },
    { title: t.openDestinationMap, badge: t.destinationSuggestion, action: t.openMap },
    { title: t.askAiAttractions, badge: t.aiSuggestion, action: t.askFanAtlas }
  ];
}

function categoryLabel(category: HomePlaceCard["category"], t: HomeCopy) {
  if (category === "restaurant") return t.restaurants;
  if (category === "hotel") return t.hotels;
  return t.attractions;
}

function openHomeCard(
  card: HomePlaceCard,
  setMapDestination: (destination: MapDestination | null) => void,
  setSelectedRestaurant: (restaurant: any) => void,
  setExploreCategory: (category: string) => void,
  setTab: (tab: Tab) => void
) {
  if (card.place && card.category === "restaurant") {
    setSelectedRestaurant({ ...card.place, cuisine: card.place.detail, price: "", image: card.image });
    setTab("restaurant");
    return;
  }

  if (!card.place && card.category === "restaurant") {
    setExploreCategory("Restaurants");
    setTab("explore");
    return;
  }

  if (!card.place && card.category === "attraction") {
    setExploreCategory("Attractions");
    setTab("explore");
    return;
  }

  if (card.category === "hotel" && !card.place) {
    setTab("hotels");
    return;
  }

  if (card.place) {
    setMapDestination(globalPlaceDestination(card.place));
  } else {
    setMapDestination(null);
  }

  setTab(card.category === "hotel" ? "hotels" : "map");
}

function HomeCardSection({
  title,
  cards,
  count,
  emptyText,
  suggestionTitle,
  seeAllLabel,
  onSeeAll,
  onOpen
}: {
  title: string;
  cards: HomePlaceCard[];
  count: string;
  emptyText: string;
  suggestionTitle: string;
  seeAllLabel: string;
  onSeeAll: () => void;
  onOpen: (card: HomePlaceCard) => void;
}) {
  const verifiedCards = cards.filter((card) => card.isVerified);
  const suggestionCards = cards.filter((card) => !card.isVerified);
  const sectionId = `home-section-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="home-card-section fa-page-section" aria-labelledby={sectionId}>
      <div className="home-card-section-title fa-section-header">
        <div>
          <h2 id={sectionId} className="fa-section-title">{title}</h2>
          <span className="fa-section-count">{count}</span>
        </div>
        <button className="home-see-all fa-button-secondary" type="button" onClick={onSeeAll} aria-label={seeAllLabel}>
          {seeAllLabel}
        </button>
      </div>

      {verifiedCards.length === 0 && <div className="home-inline-empty fa-empty-state">{emptyText}</div>}

      {verifiedCards.length > 0 && (
        <div className="home-card-rail">
          {verifiedCards.map((card) => (
            <button className="home-place-card fa-place-card" key={card.id} type="button" onClick={() => onOpen(card)}>
              <img src={card.image} alt={card.title} loading="lazy" />
              <span className="home-place-source fa-badge-success">{card.sourceLabel}</span>
              <strong>{card.title}</strong>
              <small>{card.badge}{card.distance ? ` · ${card.distance}` : ""}</small>
              <em>{card.action}</em>
            </button>
          ))}
        </div>
      )}

      {suggestionCards.length > 0 && (
        <div className="home-suggestion-block">
          <div className="home-suggestion-title">{suggestionTitle}</div>
          <div className="home-suggestion-rail">
            {suggestionCards.map((card) => (
              <button className="home-place-card home-suggestion-card fa-suggestion-card" key={card.id} type="button" onClick={() => onOpen(card)}>
                <img src={card.image} alt={card.title} loading="lazy" />
                <span className="home-place-source fa-badge-suggestion">{card.sourceLabel}</span>
                <strong>{card.title}</strong>
                <small>{card.badge}</small>
                <em>{card.action}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
