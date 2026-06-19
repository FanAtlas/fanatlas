import { useEffect, useMemo, useState } from "react";
import { BookOpen, Coins, Languages, ListChecks, MapPin, Monitor, Shield, Smartphone, WalletCards, MessageSquareText } from "lucide-react";
import { fanZones, places } from "../data/mockData";
import { useLanguage } from "../LanguageContext";
import { LegalFooter } from "../components/LegalFooter";
import { languages } from "../i18n";
import { Tab } from "../main";
import { getFanZoneDestination, getPlaceDestination, MapDestination } from "../mapDestinations";

type ExploreCategory = "All" | "Restaurants" | "Hotels" | "Attractions" | "Events" | "Fan Zones" | "Safety";

const categories: ExploreCategory[] = ["All", "Restaurants", "Hotels", "Attractions", "Events", "Fan Zones", "Safety"];

const hotelCards = [
  {
    name: "Marriott Times Square",
    city: "New York",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    distance: "10.8 km",
    price: "$$$"
  },
  {
    name: "Ibis Mexico City",
    city: "Mexico City",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=80",
    rating: 4.1,
    distance: "8.7 km",
    price: "$$"
  },
  {
    name: "Delta Hotels Toronto",
    city: "Toronto",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
    rating: 4.4,
    distance: "2.2 km",
    price: "$$$"
  }
];

const attractions = [
  {
    name: "Times Square",
    city: "New York",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=80",
    detail: "Public screens, restaurants, transit, and late-night energy."
  },
  {
    name: "Chapultepec Park",
    city: "Mexico City",
    image: "https://images.unsplash.com/photo-1518659526054-190340b32735?auto=format&fit=crop&w=900&q=80",
    detail: "Museums, green space, cafes, and a calmer day-before-match plan."
  }
];

const essentials = [
  { label: "eSIM", icon: Smartphone, tab: "esim" as Tab },
  { label: "Currency", icon: Coins, tab: "currency" as Tab },
  { label: "Translator", icon: Languages, tab: "translator" as Tab },
  { label: "Checklist", icon: ListChecks, tab: "checklist" as Tab },
  { label: "Expenses", icon: WalletCards, tab: "expenses" as Tab },
  { label: "Offline Guide", icon: MapPin, tab: "offline" as Tab },
  { label: "Phrasebook", icon: MessageSquareText, tab: "phrasebook" as Tab },
  { label: "Travel Guides", icon: BookOpen, tab: "guides" as Tab },
  { label: "TV Mode", icon: Monitor, tab: "tv" as Tab }
];

const safetyItems = [
  { label: "Hospitals", detail: "Find nearby medical help and emergency actions." },
  { label: "Police", detail: "Locate police stations and official emergency contacts." },
  { label: "Embassies", detail: "Consulate help based on traveler profile." },
  { label: "Emergency numbers", detail: "USA, Canada, and Mexico emergency contacts." }
];

function normalizeCategory(value?: string): ExploreCategory {
  const normalized = (value || "All").toLowerCase();
  if (normalized.includes("food") || normalized.includes("restaurant")) return "Restaurants";
  if (normalized.includes("stay") || normalized.includes("hotel")) return "Hotels";
  if (normalized.includes("fan")) return "Fan Zones";
  if (normalized.includes("event")) return "Events";
  if (normalized.includes("safety") || normalized.includes("sos")) return "Safety";
  if (normalized.includes("attraction")) return "Attractions";
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
  const [active, setActive] = useState<ExploreCategory>(() => normalizeCategory(initialCategory));
  const [query, setQuery] = useState("");

  useEffect(() => {
    setActive(normalizeCategory(initialCategory));
  }, [initialCategory]);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => !q || [place.name, place.city, place.category].join(" ").toLowerCase().includes(q));
  }, [query]);

  const show = (section: ExploreCategory) => active === "All" || active === section;

  function openRestaurant(restaurant: any) {
    if (!setSelectedRestaurant) {
      window.alert(`${t.restaurantDetails} ${t.comingSoon}.`);
      return;
    }

    setSelectedRestaurant({
      ...restaurant,
      cuisine: restaurant.cuisine || restaurant.category || "Local favorite"
    });
    setTab("restaurant");
  }

  function navigatePlace(name: string, city: string) {
    setMapDestination(getPlaceDestination(name, city) || null);
    setTab("map");
  }

  function navigateFanZone(name: string) {
    setMapDestination(getFanZoneDestination(name) || null);
    setTab("map");
  }

  return (
    <div className="explore-page-v2" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">Explore <span>Global</span></div>
          <div className="subtle">{t.exploreSubtitle}</div>
        </div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <label className="explore-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchCityRestaurantHotelEvent}
        />
      </label>

      <div className="explore-tabs">
        {categories.map((category) => (
          <button
            className={active === category ? "active" : ""}
            key={category}
            onClick={() => setActive(category)}
          >
            {category === "All" ? "All" : category === "Restaurants" ? t.restaurants : category === "Hotels" ? t.hotels : category === "Attractions" ? t.attractions : category === "Events" ? t.events : category === "Fan Zones" ? t.fanZones : t.safetyNearby}
          </button>
        ))}
      </div>

      {active === "All" && (
        <section className="explore-section">
          <div className="section-row">
            <h3>{t.travelEssentials}</h3>
            <button className="mini-btn" onClick={() => setTab("traveltools")}>{t.allTools}</button>
          </div>
          <div className="essentials-grid">
            {essentials.map((item) => {
              const Icon = item.icon;
              return (
                <button className="essential-card" key={item.label} onClick={() => setTab(item.tab)}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="featured-destination-card">
        <span>Featured destination</span>
        <h1>New York / New Jersey</h1>
        <p>World Cup stadium, fan zones, restaurants and hotels nearby.</p>
        <button className="secondary-btn" onClick={() => setTab("map")}>{t.open} {t.map}</button>
      </section>

      {show("Restaurants") && (
        <section className="explore-section">
          <div className="section-row">
            <h3>{t.restaurants}</h3>
            <span className="subtle">{filteredRestaurants.length} places</span>
          </div>
          <div className="explore-card-scroll">
            {filteredRestaurants.map((restaurant) => (
              <article className="explore-image-card" key={restaurant.name}>
                <img src={restaurant.image} alt={restaurant.name} />
                <div>
                  <strong>{restaurant.name}</strong>
                  <p>{restaurant.city} · ⭐ {restaurant.rating} · {restaurant.distance}</p>
                  <span>{restaurant.busy.replace("_", " ")} busy</span>
                </div>
                <button className="primary-btn" onClick={() => openRestaurant(restaurant)}>{t.viewDetails}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {show("Hotels") && (
        <section className="explore-section">
          <h3>{t.hotels}</h3>
          <div className="explore-card-scroll">
            {hotelCards.map((hotel) => (
              <article className="explore-image-card" key={hotel.name}>
                <img src={hotel.image} alt={hotel.name} />
                <div>
                  <strong>{hotel.name}</strong>
                  <p>{hotel.city} · ⭐ {hotel.rating} · {hotel.distance}</p>
                  <span>{hotel.price}</span>
                </div>
                <button className="primary-btn" onClick={() => setTab("hotels")}>{t.searchHotels}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {show("Attractions") && (
        <section className="explore-section">
          <h3>{t.attractions}</h3>
          <div className="explore-card-scroll">
            {attractions.map((place) => (
              <article className="explore-image-card" key={place.name}>
                <img src={place.image} alt={place.name} />
                <div>
                  <strong>{place.name}</strong>
                  <p>{place.city}</p>
                  <span>{place.detail}</span>
                </div>
                <button className="secondary-btn" onClick={() => navigatePlace(place.name, place.city)}>{t.navigate}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {show("Events") && (
        <section className="explore-section">
          <h3>{t.fanZones} / {t.events}</h3>
          <div className="event-card-list">
            {fanZones.map((zone) => (
              <article className="event-card" key={zone.name}>
                <div>
                  <strong>{zone.name}</strong>
                  <p>{zone.city} · {zone.hours} · {zone.capacity}</p>
                  <span>{zone.entry}</span>
                </div>
                <div className="event-actions">
                  <button className="secondary-btn" onClick={() => navigateFanZone(zone.name)}>{t.viewDetails}</button>
                  <button className="secondary-btn" onClick={() => setTab("fanzonevip")}>VIP</button>
                  <button className="secondary-btn" onClick={() => setTab("fanzonetransport")}>Transport</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {show("Fan Zones") && active === "Fan Zones" && (
        <section className="explore-section">
          <button className="primary-btn full-width" onClick={() => setTab("fanzones")}>{t.open} {t.fanZones}</button>
        </section>
      )}

      {show("Safety") && (
        <section className="explore-section safety-explore-section">
          <div className="section-row">
            <h3>{t.safetyNearby}</h3>
            <button className="mini-btn" onClick={() => setTab("sos")}>SOS</button>
          </div>
          <div className="safety-grid">
            {safetyItems.map((item) => (
              <button className="safety-card" key={item.label} onClick={() => setTab("sos")}>
                <Shield size={18} />
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <LegalFooter setTab={setTab} />
    </div>
  );
}
