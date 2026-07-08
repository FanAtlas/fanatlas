import { useState } from "react";
import { Hotel, MapPin } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { FavoriteButton } from "../components/FavoriteButton";
import { trackRevenueClick } from "../services/revenueTracking";
import { directionsUrl, distanceKm, formatDistance } from "../lib/location";
import { useTravelLocation } from "../TravelLocationContext";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";
import { GlobalPlace, placeEmoji } from "../services/globalPlaces";

export type HotelOffer = {
  id: string;
  name: string;
  city: string;
  stadium: string;
  image: string;
  rating: number;
  price: string;
  distanceKm: number;
  lat: number;
  lng: number;
  provider: string;
  affiliatePath: string;
};

export const hotelOffers: HotelOffer[] = [
  {
    id: "nyc-marriott-times-square",
    name: "Marriott Times Square",
    city: "New York",
    stadium: "MetLife Stadium",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    price: "$220/night",
    distanceKm: 10.8,
    lat: 40.7586,
    lng: -73.9851,
    provider: "Booking Partner",
    affiliatePath: "marriott-times-square"
  },
  {
    id: "nyc-moxy-chelsea",
    name: "Moxy Chelsea",
    city: "New York",
    stadium: "MetLife Stadium",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
    rating: 4.3,
    price: "$185/night",
    distanceKm: 11.5,
    lat: 40.7464,
    lng: -73.9933,
    provider: "Hotel Partner",
    affiliatePath: "moxy-chelsea"
  },
  {
    id: "mx-ibis-reforma",
    name: "Ibis Mexico City",
    city: "Mexico City",
    stadium: "Estadio Azteca",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=80",
    rating: 4.1,
    price: "$80/night",
    distanceKm: 8.7,
    lat: 19.4285,
    lng: -99.1677,
    provider: "Booking Partner",
    affiliatePath: "ibis-mexico-city"
  },
  {
    id: "mx-galeria-plaza",
    name: "Galeria Plaza Reforma",
    city: "Mexico City",
    stadium: "Estadio Azteca",
    image: "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=900&q=80",
    rating: 4.4,
    price: "$135/night",
    distanceKm: 9.4,
    lat: 19.426,
    lng: -99.1688,
    provider: "Hotel Partner",
    affiliatePath: "galeria-plaza-reforma"
  },
  {
    id: "la-holiday-inn-lax",
    name: "Holiday Inn Los Angeles",
    city: "Los Angeles",
    stadium: "SoFi Stadium",
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
    rating: 4.2,
    price: "$145/night",
    distanceKm: 2.1,
    lat: 33.9466,
    lng: -118.3852,
    provider: "Booking Partner",
    affiliatePath: "holiday-inn-los-angeles"
  },
  {
    id: "la-cambria-lax",
    name: "Cambria LAX",
    city: "Los Angeles",
    stadium: "SoFi Stadium",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    rating: 4.4,
    price: "$168/night",
    distanceKm: 3.6,
    lat: 33.9235,
    lng: -118.391,
    provider: "Hotel Partner",
    affiliatePath: "cambria-lax"
  },
  {
    id: "toronto-delta",
    name: "Delta Hotels Toronto",
    city: "Toronto",
    stadium: "BMO Field",
    image: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    price: "$210/night",
    distanceKm: 2.4,
    lat: 43.6428,
    lng: -79.3837,
    provider: "Booking Partner",
    affiliatePath: "delta-hotels-toronto"
  },
  {
    id: "dallas-live-loews",
    name: "Live by Loews Arlington",
    city: "Dallas",
    stadium: "AT&T Stadium",
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    price: "$260/night",
    distanceKm: 0.6,
    lat: 32.7506,
    lng: -97.0871,
    provider: "Hotel Partner",
    affiliatePath: "live-by-loews-arlington"
  }
];

function bookingUrl(offer: HotelOffer) {
  const baseUrl = import.meta.env.VITE_HOTEL_AFFILIATE_BASE_URL || "https://www.booking.com/searchresults.html";
  const params = new URLSearchParams({
    ss: `${offer.name} ${offer.city}`,
    aid: import.meta.env.VITE_HOTEL_AFFILIATE_ID || "fanatlas",
    label: `fanatlas-${offer.affiliatePath}`
  });

  return `${baseUrl}?${params.toString()}`;
}

function bookingSearchUrl(place: GlobalPlace) {
  const baseUrl = import.meta.env.VITE_HOTEL_AFFILIATE_BASE_URL || "https://www.booking.com/searchresults.html";
  const params = new URLSearchParams({
    ss: `${place.name} ${place.city} ${place.country}`,
    aid: import.meta.env.VITE_HOTEL_AFFILIATE_ID || "fanatlas",
    label: `fanatlas-${place.id}`
  });

  return `${baseUrl}?${params.toString()}`;
}

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
  const { groups, loading, message, refreshPlaces } = useGlobalPlaces();
  const [notificationMessage, setNotificationMessage] = useState("");
  const offers = groups.hotels;

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
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">{t.hotels}</div>
          <div className="subtle">Hotels in {travelLocation.destinationCity}, {travelLocation.destinationCountry}</div>
        </div>
      </div>

      <button className="travel-location-pill" onClick={() => setTab("travelLocation")}>
        <span>Traveling to: {travelLocation.destinationCity}, {travelLocation.destinationCountry}</span>
        <strong>Change</strong>
      </button>

      <div className="hotel-search-hero">
        <Hotel size={30} />
        <div>
          <h1>Nearby Hotels</h1>
          <p>Compare hotel partners for your selected destination.</p>
        </div>
      </div>

      {loading && <div className="location-fallback">{message || `Finding live places near ${travelLocation.destinationCity}...`}</div>}
      {!loading && message && (
        <div className="location-fallback">
          {message}
          {message.includes("Finding live places") && <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>}
        </div>
      )}

      <div className="section-row">
        <h3>{travelLocation.destinationCity}</h3>
        <span className="section-badge">{offers.length} hotels</span>
      </div>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}

      {offers.length === 0 && (
        <div className="card-dark">
          <strong>{travelLocation.destinationCity} hotel tools are ready.</strong>
          <p className="subtle">Use Map or hotel search while live hotel partners refresh.</p>
          <button className="places-retry-btn" onClick={refreshPlaces}>Try Again</button>
        </div>
      )}

      <div className="hotel-offer-list">
        {offers.map((offer) => (
          <article className="hotel-offer-card" key={offer.id}>
            <div className="hotel-offer-body">
              <div>
                <strong>{placeEmoji(offer.category)} {offer.name}</strong>
                <p>{offer.city} · {offer.detail}</p>
              </div>

              <FavoriteButton
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

              <div className="hotel-offer-meta">
                <span><MapPin size={14} /> {formatDistance(distanceKm(travelLocation, offer))} from destination center</span>
                <strong>OpenStreetMap</strong>
              </div>

              <div className="hotel-offer-actions">
                <button
                  className="secondary-btn"
                  onClick={() => {
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
                >
                  Quick directions
                </button>
                <a
                  className="secondary-btn"
                  href={directionsUrl(offer)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open maps
                </a>
                <button className="secondary-btn" onClick={() => addHotelReminder(offer)}>
                  Remind me
                </button>
                <a
                  className="buy-btn"
                  href={bookingSearchUrl(offer)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackRevenueClick({
                    type: "hotel",
                    product: offer.name,
                    city: offer.city,
                    provider: "Booking Partner",
                    amount: "Search",
                    url: bookingSearchUrl(offer),
                    source: "Hotels Page"
                  })}
                >
                  Book Hotel
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="action-note">
        <Hotel size={18} />
        <span>Compare hotel options, confirm details with the booking provider, and save your stay before match day.</span>
      </div>
    </div>
  );
}
