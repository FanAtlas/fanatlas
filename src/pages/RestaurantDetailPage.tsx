import { useMemo, useState } from "react";
import { Bot, ExternalLink, Globe, Info, MapPin, Phone, Search, ShieldCheck, Utensils } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { FavoriteButton } from "../components/FavoriteButton";
import { getDeliveryProviders } from "../data/deliveryProviders";
import { imageForCategory } from "../data/categoryImages";
import { classifyPlaceTrust, getCoordinates, normalizePlaceType, placeToMapDestination, stablePlaceId } from "../lib/placeUtils";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { useTravelLocation } from "../TravelLocationContext";
import { useLanguage } from "../LanguageContext";

type RawRestaurant = Record<string, any>;

type NormalizedRestaurant = {
  id: string;
  providerId?: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
  category?: string;
  cuisine?: string;
  source?: string;
  sourceLabel: string;
  trustKind: "verified" | "static" | "suggestion" | "limited";
  rating?: number;
  reviewCount?: number;
  price?: string;
  distance?: string;
  phone?: string;
  website?: string;
  reserveUrl?: string;
  detail?: string;
  isVerified: boolean;
  isSuggestion: boolean;
  isStatic: boolean;
  hasValidCoordinates: boolean;
  stableId: string;
  raw: RawRestaurant;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function validRating(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 5 ? value : undefined;
}

function specificCuisine(value: unknown) {
  const text = normalizeText(value);
  const generic = ["restaurant", "cafe", "café", "fast food", "food", "food and drink", "bar"];
  if (!text || generic.includes(text.toLowerCase())) return "";
  return text;
}

function safeExternalUrl(value: string | undefined) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function sourceLabel(source: string | undefined) {
  if (source === "google_places") return "Google Places";
  if (source === "openstreetmap") return "OpenStreetMap";
  if (source === "fallback") return "Restaurant search";
  return "Limited details";
}

function normalizeRestaurant(input: RawRestaurant | null, destinationCity: string, destinationCountry: string): NormalizedRestaurant | null {
  if (!input || typeof input !== "object") return null;

  const name = normalizeText(input.name || input.title);
  if (!name) return null;

  const city = normalizeText(input.city) || destinationCity;
  const country = normalizeText(input.country) || destinationCountry;
  const source = normalizeText(input.source);
  const coordinates = getCoordinates(input);
  const trust = classifyPlaceTrust({
    ...input,
    name,
    city,
    country,
    source,
    type: input.type || input.category,
    category: input.category || input.type
  });
  const hasValidCoordinates = coordinates !== null;
  const isVerified = trust === "verified_provider";
  const isSuggestion = trust === "destination_suggestion" || /search|suggestion/i.test(name);
  const isStatic = trust === "static_editorial" || (!source && (typeof input.rating === "number" || Boolean(input.reserveUrl) || Boolean(input.busy)));
  const providerId = normalizeText(input.providerId || input.placeId || input.googlePlaceId || input.id);
  const category = normalizeText(input.category || input.type) || normalizePlaceType(input);
  const cuisine = specificCuisine(input.cuisine || input.detail);
  const reserveUrl = safeExternalUrl(normalizeText(input.reserveUrl));
  const website = safeExternalUrl(normalizeText(input.website));
  const id = providerId ||
    (coordinates && source ? `${source}-${coordinates.lat.toFixed(5)}-${coordinates.lng.toFixed(5)}-${slug(name)}` : "") ||
    `${slug(name)}-${slug(city)}-${slug(country)}`;
  const stableId = stablePlaceId({
    ...input,
    id,
    name,
    city,
    country,
    source,
    type: input.type || input.category,
    category: input.category || input.type
  });

  return {
    id,
    providerId,
    name,
    city,
    country,
    address: normalizeText(input.address) || undefined,
    latitude: coordinates?.lat,
    longitude: coordinates?.lng,
    image: normalizeText(input.image) || undefined,
    category,
    cuisine: cuisine || undefined,
    source: source || undefined,
    sourceLabel: isVerified ? sourceLabel(source) : isSuggestion ? "Restaurant search" : isStatic ? "Curated suggestion" : "Limited details",
    trustKind: isVerified ? "verified" : isSuggestion ? "suggestion" : isStatic ? "static" : "limited",
    rating: validRating(input.rating),
    reviewCount: typeof input.reviewCount === "number" && input.reviewCount > 0 ? input.reviewCount : undefined,
    price: normalizeText(input.price) || undefined,
    distance: normalizeText(input.distance) || undefined,
    phone: normalizeText(input.phone) || undefined,
    website: website || undefined,
    reserveUrl: reserveUrl || undefined,
    detail: normalizeText(input.detail || input.description) || undefined,
    isVerified,
    isSuggestion,
    isStatic,
    hasValidCoordinates,
    stableId,
    raw: input
  };
}

function reservationSearchUrl(restaurant: NormalizedRestaurant) {
  const query = encodeURIComponent([restaurant.name, restaurant.city, restaurant.country].filter(Boolean).join(" "));
  return restaurant.reserveUrl || `https://www.opentable.com/s?term=${query}`;
}

function onlineSearchUrl(restaurant: NormalizedRestaurant) {
  const query = encodeURIComponent([restaurant.name, restaurant.city, restaurant.country].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${query}`;
}

function fallbackRestaurantImage(restaurant: NormalizedRestaurant | { name: string; city: string }) {
  const key = `${restaurant.name}-${restaurant.city}`;
  const index = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return imageForCategory("restaurant", index);
}

export function RestaurantDetailPage({
  onBack,
  restaurant,
  setExploreCategory,
  setMapDestination,
  setTab
}: {
  onBack: () => void;
  restaurant: RawRestaurant | null;
  setExploreCategory?: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { t, language } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const normalized = useMemo(
    () => normalizeRestaurant(restaurant, travelLocation.destinationCity, travelLocation.destinationCountry),
    [restaurant, travelLocation.destinationCity, travelLocation.destinationCountry]
  );
  const fallbackImage = normalized ? fallbackRestaurantImage(normalized) : imageForCategory("restaurant", 0);
  const [imageSrc, setImageSrc] = useState(normalized?.image || fallbackImage);

  const providers = useMemo(
    () => normalized ? getDeliveryProviders(normalized.country, normalized.city).slice(0, 3) : [],
    [normalized]
  );

  if (!normalized) {
    return (
      <div className="restaurant-detail-page restaurant-premium-page fa-page" dir={language === "ar" ? "rtl" : "ltr"}>
        <header className="restaurant-topbar fa-page-header fa-page-header-sticky">
          <BackButton onBack={onBack} />
          <div className="restaurant-topbar-title">
            <strong>{t.restaurantDetails}</strong>
            <span>{travelLocation.destinationCity}</span>
          </div>
        </header>

        <section className="restaurant-empty-state fa-empty-state" role="status" aria-live="polite">
          <strong>{t.noRestaurantSelected}</strong>
          <p>{t.noRestaurantSelectedMessage}</p>
          <div className="restaurant-empty-actions">
            <button className="fa-button-secondary" type="button" onClick={onBack}>{t.back}</button>
            <button
              className="fa-button-primary"
              type="button"
              onClick={() => {
                setExploreCategory?.("Restaurants");
                setTab("explore");
              }}
            >
              {t.exploreMoreRestaurants}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const metadata = [
    normalized.rating ? { label: t.rating, value: normalized.reviewCount ? `${normalized.rating.toFixed(1)} · ${normalized.reviewCount}` : normalized.rating.toFixed(1) } : null,
    normalized.distance && !normalized.isStatic ? { label: t.distance, value: normalized.distance } : null,
    normalized.price && !normalized.isStatic ? { label: t.price, value: normalized.price } : null,
    normalized.address ? { label: t.address, value: normalized.address } : null,
    { label: t.source, value: normalized.sourceLabel }
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const favoriteItem = {
    item_type: "restaurant" as const,
    item_id: normalized.id,
    name: normalized.name,
    city: normalized.city,
    image: normalized.image || fallbackImage,
    metadata: {
      ...normalized.raw,
      id: normalized.providerId || normalized.id,
      source: normalized.source,
      sourceLabel: normalized.sourceLabel,
      isVerified: normalized.isVerified,
      isSuggestion: normalized.isSuggestion,
      isStatic: normalized.isStatic,
      stablePlaceId: normalized.stableId
    }
  };

  function openMap() {
    if (!normalized?.hasValidCoordinates || normalized.latitude === undefined || normalized.longitude === undefined) return;

    const destination = placeToMapDestination({
      ...normalized.raw,
      id: normalized.id,
      name: normalized.name,
      city: normalized.city,
      country: normalized.country,
      lat: normalized.latitude,
      lng: normalized.longitude,
      source: normalized.source,
      type: "restaurant",
      category: "restaurant",
      detail: normalized.detail,
      address: normalized.address,
      image: normalized.image,
      emoji: "🍽"
    });
    if (!destination) return;

    setMapDestination({
      ...destination,
      safetyNotes: normalized.source === "openstreetmap"
        ? "OpenStreetMap community place data. Verify details before travel."
        : undefined
    });
    setTab("map");
  }

  function handleImageError() {
    if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
  }

  const categoryLabel = normalized.cuisine || normalized.detail || normalized.category || t.restaurant;

  return (
    <div className="restaurant-detail-page restaurant-premium-page fa-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="restaurant-topbar fa-page-header fa-page-header-sticky">
        <BackButton onBack={onBack} />
        <div className="restaurant-topbar-title">
          <strong>{t.restaurant}</strong>
          <span>{normalized.city}, {normalized.country}</span>
        </div>
        <FavoriteButton item={favoriteItem} compact />
      </header>

      <section className="restaurant-image-panel">
        <img src={imageSrc} alt={normalized.name} loading="lazy" onError={handleImageError} />
      </section>

      <section className="restaurant-identity-card fa-card">
        <span className={`restaurant-trust-badge ${normalized.trustKind}`}>
          <ShieldCheck size={14} aria-hidden="true" />
          {normalized.isVerified ? t.verifiedPlace : normalized.isStatic ? t.travelSuggestion : normalized.isSuggestion ? t.restaurantSearch : t.limitedDetails}
        </span>
        <h1>{normalized.name}</h1>
        <p>{categoryLabel} · {normalized.city}{normalized.country ? `, ${normalized.country}` : ""}</p>

        {metadata.length > 0 && (
          <div className="restaurant-metadata-list">
            {metadata.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="restaurant-primary-actions" aria-label={t.restaurantPrimaryActions}>
        {normalized.hasValidCoordinates && (
          <button className="fa-button-primary" type="button" onClick={openMap}>
            <MapPin size={16} aria-hidden="true" /> {t.viewOnMap}
          </button>
        )}
        <a className="fa-button-secondary" href={onlineSearchUrl(normalized)} target="_blank" rel="noopener noreferrer">
          <Search size={16} aria-hidden="true" /> {t.searchRestaurant}
        </a>
      </section>

      <section className="restaurant-secondary-actions fa-card-compact" aria-label={t.restaurantSecondaryActions}>
        {normalized.phone && (
          <a className="fa-button-ghost" href={`tel:${normalized.phone}`}>
            <Phone size={15} aria-hidden="true" /> {t.callRestaurant}
          </a>
        )}
        {normalized.website && (
          <a className="fa-button-ghost" href={normalized.website} target="_blank" rel="noopener noreferrer">
            <Globe size={15} aria-hidden="true" /> {t.visitWebsite}
          </a>
        )}
        <a className="fa-button-ghost" href={reservationSearchUrl(normalized)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> {t.searchReservations}
        </a>
        {providers.length > 0 && (
          <details className="restaurant-more-options">
            <summary>{t.moreSearchOptions}</summary>
            <div>
              {providers.map((provider) => (
                <a
                  className="fa-button-ghost"
                  href={provider.searchUrl(normalized.name, `${normalized.city} ${normalized.country}`)}
                  key={provider.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.searchDelivery} {provider.name}
                </a>
              ))}
            </div>
          </details>
        )}
      </section>

      {(normalized.address || normalized.detail || normalized.phone || normalized.website || normalized.sourceLabel) && (
        <section className="restaurant-info-card fa-card" aria-labelledby="restaurant-info-title">
          <div className="restaurant-section-heading">
            <Info size={17} aria-hidden="true" />
            <h2 id="restaurant-info-title">{t.restaurantInformation}</h2>
          </div>
          <dl>
            {normalized.address && (
              <>
                <dt>{t.address}</dt>
                <dd>{normalized.address}</dd>
              </>
            )}
            {normalized.detail && (
              <>
                <dt>{t.category}</dt>
                <dd>{normalized.detail}</dd>
              </>
            )}
            <dt>{t.source}</dt>
            <dd>{normalized.sourceLabel}</dd>
          </dl>
        </section>
      )}

      <section className="restaurant-ai-card fa-summary-card">
        <Bot size={20} aria-hidden="true" />
        <div>
          <span className="fa-badge">{t.askFanAtlas}</span>
          <h2>{t.askAboutFood}</h2>
          <p>{t.askAboutFoodDesc}</p>
        </div>
        <button className="fa-button-primary" type="button" onClick={() => setTab("ai")}>
          {t.askAboutFood}
        </button>
      </section>

      <section className="restaurant-explore-card fa-card">
        <Utensils size={18} aria-hidden="true" />
        <div>
          <h2>{t.exploreMoreRestaurants}</h2>
          <p>{t.exploreMoreRestaurantsDesc}</p>
        </div>
        <button
          className="fa-button-secondary"
          type="button"
          onClick={() => {
            setExploreCategory?.("Restaurants");
            setTab("explore");
          }}
        >
          {t.exploreMoreRestaurants}
        </button>
      </section>

      <div className="restaurant-disclosure fa-inline-message">
        {t.externalSearchDisclosure}
      </div>
    </div>
  );
}
