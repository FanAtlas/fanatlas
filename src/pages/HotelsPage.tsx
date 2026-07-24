import { useMemo, useState } from "react";
import { Bell, ExternalLink, Hotel, MapPin, Search, X } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { FavoriteButton } from "../components/FavoriteButton";
import { directionsUrl, distanceKm, formatDistance } from "../lib/location";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";
import { imageForCategory } from "../data/categoryImages";
import { hotelSearchLinks } from "../services/hotelLinks";
import { ensureMinimumPlaces } from "../data/globalFallbackContent";

type HotelFilter = "Nearby" | "Search Options";

const hotelFilters: HotelFilter[] = ["Nearby", "Search Options"];

export function HotelsPage({
  onBack,
  setMapDestination,
  setTab
}: {
  onBack: () => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language, t } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const { groups, loading, message, refreshPlaces, error } = useGlobalPlaces();
  const [notificationMessage, setNotificationMessage] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<HotelFilter>("Nearby");

  const realHotels = useMemo(
    () => groups.hotels.filter((offer) => isRealHotel(offer) && hasValidCoordinates(offer)),
    [groups.hotels]
  );
  const staySuggestions = useMemo(
    () => ensureMinimumPlaces(travelLocation, groups.hotels, "hotel").filter((offer) => offer.source === "fallback"),
    [groups.hotels, travelLocation]
  );
  const filteredRealHotels = useMemo(
    () => filterHotels(realHotels, query),
    [query, realHotels]
  );
  const filteredSuggestions = useMemo(
    () => filterHotels(staySuggestions, query),
    [query, staySuggestions]
  );

  async function addHotelReminder(offer: GlobalPlace) {
    const { permission } = await scheduleNotification({
      type: "hotel",
      title: `Hotel reminder: ${offer.name}`,
      message: `Review booking, check-in, cancellation policy, and route for ${offer.name} in ${offer.city}.`,
      dueAt: reminderDate(1440),
      source: "Hotels",
      actionTab: "hotels"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Hotel reminder saved in FanAtlas. Browser notifications are blocked."
        : `Hotel reminder saved for ${offer.name}.`
    );
  }

  return (
    <div className="hotels-revenue-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="hotels-premium-topbar">
        <BackButton onBack={onBack} />
        <div className="hotels-title-lockup">
          <span>{t.hotels}</span>
          <strong>{travelLocation.destinationCity}, {travelLocation.destinationCountry}</strong>
        </div>
        <button className="hotels-change-btn" type="button" onClick={() => setTab("travelLocation")}>
          Change
        </button>
      </div>

      <section className="hotels-search-panel" aria-label="Hotel search and filters">
        <label className="hotels-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search hotels in ${travelLocation.destinationCity}`}
            aria-label={`Search hotels in ${travelLocation.destinationCity}`}
          />
          {query && (
            <button className="hotels-search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear hotel search" title="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="hotels-filter-row" aria-label="Hotel filters">
          {hotelFilters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter}
              className={activeFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="hotels-summary-card">
        <div>
          <span>{realHotels.length} verified nearby</span>
          <strong>Nearby stays</strong>
          <p>Search real hotel results separately from stay-search suggestions.</p>
        </div>
        <Hotel size={24} aria-hidden="true" />
      </section>

      {loading && <div className="hotels-inline-state">{message || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
      {!loading && error && (
        <div className="hotels-inline-state">
          {error}
          <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
        </div>
      )}
      {!loading && message && (
        <div className="hotels-inline-state">
          {message}
          {message.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}

      {activeFilter === "Nearby" && (
        <section className="hotels-section">
          <div className="hotels-section-heading">
            <div>
              <span>Verified nearby stays</span>
              <h2>{travelLocation.destinationCity}</h2>
            </div>
            <small>{filteredRealHotels.length} nearby</small>
          </div>

          {filteredRealHotels.length === 0 && (
            <div className="hotels-empty-card">
              <strong>No verified nearby hotels are available yet.</strong>
              <p>Try refreshing live places or use the stay-search options below.</p>
              <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
            </div>
          )}

          <div className="hotel-offer-list">
            {filteredRealHotels.map((offer, index) => (
              <HotelOfferCard
                index={index}
                key={offer.id}
                offer={offer}
                onMap={() => {
                  setMapDestination({
                    name: offer.name,
                    city: offer.city,
                    lat: offer.lat,
                    lng: offer.lng,
                    emoji: placeEmoji(offer.category),
                    type: "hotel",
                    address: offer.address,
                    openingHours: offer.detail
                  });
                  setTab("map");
                }}
                onReminder={() => addHotelReminder(offer)}
                travelLocation={travelLocation}
              />
            ))}
          </div>
        </section>
      )}

      <section className="hotels-section">
        <div className="hotels-section-heading">
          <div>
            <span>Stay search options</span>
            <h2>Compare stays</h2>
          </div>
          <small>{filteredSuggestions.length} options</small>
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="hotels-empty-card">
            <strong>No matching stay-search suggestions.</strong>
            <p>Clear search or try another hotel area.</p>
          </div>
        )}

        <div className="hotel-suggestion-list">
          {filteredSuggestions.map((offer, index) => (
            <HotelSuggestionCard index={index} key={offer.id} offer={offer} />
          ))}
        </div>
      </section>

      <div className="hotels-trust-note">
        <Hotel size={18} />
        <span>FanAtlas may earn a commission when you use partner search links. Prices and availability are shown by the provider.</span>
      </div>
    </div>
  );
}

function HotelOfferCard({
  index,
  offer,
  onMap,
  onReminder,
  travelLocation
}: {
  index: number;
  key?: string;
  offer: GlobalPlace;
  onMap: () => void;
  onReminder: () => void | Promise<void>;
  travelLocation: { latitude: number; longitude: number };
}) {
  const fallbackImage = imageForCategory("hotel", index);
  const [imageSrc, setImageSrc] = useState(offer.image || fallbackImage);
  const distance = formatDistance(distanceKm(travelLocation, offer));

  function handleImageError() {
    if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
  }

  return (
    <article className="hotel-offer-card">
      <img
        className="hotel-offer-image"
        src={imageSrc}
        alt={offer.name}
        loading="lazy"
        onError={handleImageError}
      />
      <div className="hotel-offer-body">
        <div className="hotel-offer-heading">
          <span className="hotel-card-badge">{offer.source === "google_places" ? "Verified place" : "OpenStreetMap"}</span>
          <strong>{placeEmoji(offer.category)} {offer.name}</strong>
          <p>{offer.city} · {offer.detail}</p>
        </div>

        <div className="hotel-offer-topline">
          <span><MapPin size={14} /> {distance}</span>
          <FavoriteButton
            compact
            item={{
              item_type: "hotel",
              item_id: offer.id,
              name: offer.name,
              city: offer.city,
              metadata: {
                ...offer,
                destination: {
                  name: offer.name,
                  city: offer.city,
                  lat: offer.lat,
                  lng: offer.lng,
                  emoji: placeEmoji(offer.category),
                  type: "hotel"
                }
              }
            }}
          />
        </div>

        <div className="hotel-primary-actions">
          <button className="hotel-primary-action" onClick={onMap} type="button" aria-label={`View ${offer.name} on FanAtlas map`}>
            <MapPin size={15} /> View on Map
          </button>
          <details className="hotel-more-actions">
            <summary>More options</summary>
            <div>
              <a href={directionsUrl(offer)} target="_blank" rel="noopener noreferrer">
                Open Google Maps <ExternalLink size={14} />
              </a>
              <button onClick={onReminder} type="button">
                <Bell size={14} /> Remind Me
              </button>
              {hotelSearchLinks(offer).map((link) => (
                <a href={link.url} key={link.label} target="_blank" rel="noopener noreferrer">
                  {link.label} <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function HotelSuggestionCard({ index, offer }: { index: number; key?: string; offer: GlobalPlace }) {
  const fallbackImage = imageForCategory("hotel", index);
  const [imageSrc, setImageSrc] = useState(fallbackImage);
  const link = hotelSearchLinks(offer)[index % 3];

  function handleImageError() {
    if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
  }

  return (
    <article className="hotel-suggestion-card">
      <img src={imageSrc} alt="" loading="lazy" onError={handleImageError} />
      <div>
        <span>Search suggestion</span>
        <strong>{offer.name}</strong>
        <p>{offer.city} · {offer.detail}</p>
      </div>
      <a className="hotel-suggestion-action" href={link.url} target="_blank" rel="noopener noreferrer">
        {link.label} <ExternalLink size={14} />
      </a>
    </article>
  );
}

function filterHotels(offers: GlobalPlace[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return offers;

  return offers.filter((offer) => (
    `${offer.name} ${offer.city} ${offer.country} ${offer.detail}`.toLowerCase().includes(normalized)
  ));
}

function isRealHotel(offer: GlobalPlace) {
  return offer.source === "google_places" || offer.source === "openstreetmap";
}

function hasValidCoordinates(offer: GlobalPlace) {
  return Number.isFinite(offer.lat) &&
    Number.isFinite(offer.lng) &&
    offer.lat >= -90 &&
    offer.lat <= 90 &&
    offer.lng >= -180 &&
    offer.lng <= 180 &&
    (offer.lat !== 0 || offer.lng !== 0);
}
