import { useMemo, useState } from "react";
import { Hotel, MapPin, Search, Star } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { getPlaceDestination, MapDestination } from "../mapDestinations";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { FavoriteButton } from "../components/FavoriteButton";
import { trackRevenueClick } from "../services/revenueTracking";
import { useLocation } from "../LocationContext";
import { directionsUrl, distanceKm, formatDistance } from "../lib/location";

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

const stadiums = [
  "MetLife Stadium",
  "Estadio Azteca",
  "SoFi Stadium",
  "BMO Field",
  "AT&T Stadium"
];

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
  const { location, status: locationStatus } = useLocation();
  const [selectedStadium, setSelectedStadium] = useState(stadiums[0]);
  const [searchedStadium, setSearchedStadium] = useState(stadiums[0]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const offers = useMemo(() => {
    if (location) {
      return hotelOffers
        .map((offer) => ({ ...offer, userDistanceKm: distanceKm(location, offer) }))
        .sort((a, b) => a.userDistanceKm - b.userDistanceKm);
    }

    return hotelOffers
      .filter((offer) => offer.stadium === searchedStadium)
      .map((offer) => ({ ...offer, userDistanceKm: offer.distanceKm }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [location, searchedStadium]);

  async function addHotelReminder(offer: HotelOffer) {
    const { permission } = await scheduleNotification({
      type: "hotel",
      title: `Hotel reminder: ${offer.name}`,
      message: `${offer.price} near ${offer.stadium}. Review booking, check-in, cancellation policy, and route.`,
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
          <div className="subtle">{t.stayNear}</div>
        </div>
      </div>

      <div className="hotel-search-hero">
        <Hotel size={30} />
        <div>
          <h1>{t.searchHotelsNearStadium}</h1>
          <p>{t.compareHotels}</p>
        </div>
      </div>

      <div className="hotel-search-panel">
        <label>
          Stadium
          <select
            className="input"
            value={selectedStadium}
            onChange={(event) => setSelectedStadium(event.target.value)}
          >
            {stadiums.map((stadium) => (
              <option key={stadium}>{stadium}</option>
            ))}
          </select>
        </label>

        <button className="primary-btn full-width" onClick={() => setSearchedStadium(selectedStadium)}>
          <Search size={17} /> {t.searchHotelsNearStadium}
        </button>
      </div>

      {locationStatus !== "available" && locationStatus !== "requesting" && (
        <div className="location-fallback">Enable location for nearby recommendations.</div>
      )}

      <div className="section-row">
        <h3>{location ? "Hotels near me" : searchedStadium}</h3>
        <span className="section-badge">{offers.length} hotels</span>
      </div>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}

      <div className="hotel-offer-list">
        {offers.map((offer) => (
          <article className="hotel-offer-card" key={offer.id}>
            <img src={offer.image} alt={offer.name} />

            <div className="hotel-offer-body">
              <div>
                <strong>{offer.name}</strong>
                <p>{offer.city} · {offer.provider}</p>
              </div>

              <FavoriteButton
                item={{
                  item_type: "hotel",
                  item_id: offer.id,
                  name: offer.name,
                  city: offer.city,
                  image: offer.image,
                  metadata: {
                    ...offer,
                    destination: {
                      name: offer.name,
                      city: offer.city,
                      lat: offer.lat,
                      lng: offer.lng,
                      emoji: "🏨",
                      type: "hotel"
                    }
                  }
                }}
              />

              <div className="hotel-offer-meta">
                <span><Star size={14} /> {offer.rating}</span>
                <span><MapPin size={14} /> {formatDistance(offer.userDistanceKm)} from you</span>
                <strong>{offer.price}</strong>
              </div>

              <div className="hotel-offer-actions">
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setMapDestination(getPlaceDestination(offer.name, offer.city) || {
                      name: offer.name,
                      city: offer.city,
                      lat: offer.lat,
                      lng: offer.lng,
                      emoji: "🏨",
                      type: "hotel"
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
                  href={bookingUrl(offer)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackRevenueClick({
                    type: "hotel",
                    product: offer.name,
                    stadium: offer.stadium,
                    city: offer.city,
                    provider: offer.provider,
                    amount: offer.price,
                    url: bookingUrl(offer),
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
