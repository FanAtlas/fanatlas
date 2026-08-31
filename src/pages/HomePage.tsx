import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Compass,
  Hotel,
  Languages,
  LifeBuoy,
  MapPin,
  Search,
  Shield,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { LegalFooter } from "../components/LegalFooter";
import { fanZones, places, stadiums as knownStadiums } from "../data/mockData";
import { destinations } from "../data/destinations";
import { Language } from "../i18n";
import { Tab } from "../main";
import { getFanZoneDestination, getStadiumDestination, type MapDestination } from "../mapDestinations";
import { InstallBanner } from "./InstallBanner";
import { useTravelLocation } from "../TravelLocationContext";
import { useConnectivity } from "../hooks/useConnectivity";
import { useTripDrafts } from "../hooks/useTripDrafts";
import { countryFlag } from "../data/countries";
import { imageForCategory } from "../data/categoryImages";
import { GlobalPlace } from "../services/globalPlaces";
import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import { deriveTravelHome, type TravelHomeAction, type TravelHomeState, type TravelHomeViewModel } from "../lib/travelHome";
import { deriveTravelDiscovery, type TravelDiscoverySection } from "../lib/travelDiscovery";
import { resolveDestinationId } from "../lib/destinationHub";
import type { TripDayProgress } from "../lib/tripDay";
import { tripDayTranslate } from "../lib/tripDayI18n";

type HomeSearchResult = {
  type: string;
  label: string;
  name: string;
  city: string;
  destinationId?: string | null;
  item?: GlobalPlace | Record<string, unknown>;
};

type HomeCopy = typeof import("../i18n").text.en;

type HomePageProps = {
  setExploreCategory: (category: string) => void;
  setMapDestination: (destination: MapDestination | null) => void;
  setSelectedRestaurant: (restaurant: any) => void;
  setTab: (tab: Tab) => void;
  onOpenDestination?: (destinationId: string) => void;
  onOpenPreparation?: (tripId: string) => void;
  onOpenTripDay?: (tripId: string) => void;
};

export function HomePage({
  setExploreCategory,
  setMapDestination,
  setSelectedRestaurant,
  setTab,
  onOpenDestination,
  onOpenPreparation,
  onOpenTripDay
}: HomePageProps) {
  const { language, setLanguage, t } = useLanguage();
  const connectivity = useConnectivity();
  const { travelLocation } = useTravelLocation();
  const { drafts } = useTripDrafts([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  const currentDate = useMemo(() => new Date(), []);
  const intelligence = useMemo(() => deriveDestinationIntelligence({ tripDrafts: drafts, generatedAt: "session" }), [drafts]);
  const home = useMemo(
    () => deriveTravelHome({
      trips: drafts,
      intelligence,
      currentDate,
      connectivity: connectivity.status
    }),
    [connectivity.status, currentDate, drafts, intelligence]
  );
  const discovery = useMemo(
    () => deriveTravelDiscovery({
      home,
      travelLocation,
      intelligence,
      currentDate,
      connectivity: connectivity.status
    }),
    [connectivity.status, currentDate, home, intelligence, travelLocation]
  );

  useEffect(() => {
    const message = sessionStorage.getItem("fanatlas_travel_toast");
    if (!message) return;

    setToast(message);
    sessionStorage.removeItem("fanatlas_travel_toast");
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as HomeSearchResult[];

    const hotels = [
      { name: "Marriott Times Square", city: "New York", country: "United States" },
      { name: "Ibis Mexico City", city: "Mexico City", country: "Mexico" },
      { name: "Delta Hotels Toronto", city: "Toronto", country: "Canada" }
    ];
    const destinationsList = destinations.map((destination) => ({
      type: "destination",
      label: t.travelGuides,
      name: `${destination.city}, ${destination.country}`,
      city: destination.city,
      destinationId: resolveDestinationId({ city: destination.city, country: destination.country })
    }));
    const results: HomeSearchResult[] = [
      ...knownStadiums.map((item) => ({ type: "stadium", label: t.matchCenter, name: item.name, city: item.city })),
      ...places.map((item) => ({ type: "restaurant", label: t.restaurants, name: item.name, city: item.city, item })),
      ...fanZones.map((item) => ({ type: "fan-zone", label: t.fanZones, name: item.name, city: item.city })),
      ...hotels.map((item) => ({ type: "hotel", label: t.hotels, name: item.name, city: item.city })),
      ...destinationsList
    ];

    return results
      .filter((item) => `${item.name} ${item.city} ${item.type} ${item.label}`.toLowerCase().includes(query))
      .slice(0, 7);
  }, [searchQuery, t]);

  const hero = buildHeroCopy(home, t, language);
  const primaryActionLabel = resolveLabel(language, t, home.primaryAction.labelKey);

  return (
    <div className="home-page home-command-center fa-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <InstallBanner />

      <header className="home-header fa-page-header fa-page-header-sticky">
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

      {home.offlineSummary.status === "offline" && (
        <div className="fa-inline-message" role="status">
          <strong>{t.offline}</strong>
          <span>{t.offlineTripEssentials}</span>
        </div>
      )}

      <section className="home-hero-card fa-summary-card" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <span className="fa-badge">{hero.badge}</span>
          <h1 id="home-hero-title">{hero.title}</h1>
          <p>{hero.body}</p>
          {hero.detail && <small>{hero.detail}</small>}
        </div>
        <div className="home-hero-meta">
          {home.hero?.destinationLabel && <strong>{home.hero.destinationLabel}</strong>}
          {home.hero?.dayLabel && <span>{home.hero.dayLabel}</span>}
          {home.hero?.nextPlaceLabel && <span>{home.hero.nextPlaceLabel}</span>}
          {home.hero?.progress && <span>{formatProgress(home.hero.progress, language)}</span>}
          {home.hero?.daysUntilDeparture != null && home.hero.daysUntilDeparture > 0 && (
            <span>{tripDayTranslate(language, "tripDay.homeUpcoming").replace("{days}", String(home.hero.daysUntilDeparture))}</span>
          )}
          {home.hero?.daysUntilDeparture === 0 && <span>{tripDayTranslate(language, "tripDay.beforeTrip")}</span>}
          {home.hero?.daysSinceEnd != null && home.hero.daysSinceEnd > 0 && (
            <span>{tripDayTranslate(language, "tripDay.ended")}</span>
          )}
          <button className="fa-button-primary" type="button" onClick={() => runAction(home.primaryAction, { setExploreCategory, setMapDestination, setSelectedRestaurant, setTab, onOpenDestination, onOpenPreparation, onOpenTripDay })}>
            {primaryActionLabel}
          </button>
        </div>
      </section>

      <section className="home-actions-row" aria-label={t.fastActions}>
        {home.secondaryActions.map((action) => (
          <button
            className="home-action-chip fa-button-ghost"
            key={action.id}
            type="button"
            aria-label={resolveLabel(language, t, action.labelKey)}
            onClick={() => runAction(action, { setExploreCategory, setMapDestination, setSelectedRestaurant, setTab, onOpenDestination, onOpenPreparation, onOpenTripDay })}
          >
            {iconForAction(action.labelKey)}
            <span>{resolveLabel(language, t, action.labelKey)}</span>
          </button>
        ))}
      </section>

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
              onClick={() => openSearchResult(result, setMapDestination, setSelectedRestaurant, setExploreCategory, setTab, onOpenDestination)}
            >
              <span className="home-search-type">{result.label}</span>
              <strong>{result.name}</strong>
              <small>{result.city}</small>
            </button>
          ))}
        </div>
      )}

      {home.tripChooser && (
        <section className="home-context-card fa-card" aria-labelledby="home-chooser-title">
          <div className="home-context-card-heading">
            <div>
              <span>{copyKey(t, home.tripChooser.titleKey)}</span>
              <h2 id="home-chooser-title">{copyKey(t, home.tripChooser.titleKey)}</h2>
            </div>
            <CalendarDays size={20} aria-hidden="true" />
          </div>
          <div className="home-trip-list" role="list">
            {home.tripChooser.trips.map((trip) => (
              <button
                key={trip.tripId}
                className="home-trip-item"
                type="button"
                onClick={() => runAction({ id: `trip:${trip.tripId}`, labelKey: "tripDay.chooseTrip", target: { kind: "tripDay", tripId: trip.tripId }, kind: "secondary" }, { setExploreCategory, setMapDestination, setSelectedRestaurant, setTab, onOpenDestination, onOpenPreparation, onOpenTripDay })}
              >
                <strong>{trip.tripName}</strong>
                {trip.destinationLabel && <small>{trip.destinationLabel}</small>}
                {trip.startDate && <em>{formatTripDateRange(trip.startDate, trip.endDate)}</em>}
              </button>
            ))}
          </div>
        </section>
      )}

      {home.tripSummary && home.state !== "multiple_trips" && (
        <section className="home-context-card fa-card" aria-labelledby="home-trip-title">
          <div className="home-context-card-heading">
            <div>
              <span>{copyKey(t, stateTitleKey(home.state))}</span>
              <h2 id="home-trip-title">{home.tripSummary.tripName}</h2>
            </div>
            {home.state === "active_trip" || home.state === "day_complete" || home.state === "departure_day"
              ? <CalendarDays size={20} aria-hidden="true" />
              : <Compass size={20} aria-hidden="true" />}
          </div>

          <div className="home-trip-summary-grid">
            {home.tripSummary.destinationLabel && <div><span>{t.travelGuides}</span><strong>{home.tripSummary.destinationLabel}</strong></div>}
            {home.tripSummary.dayLabel && <div><span>{tripDayTranslate(language, "tripDay.dayOf").replace("{day}", String(home.tripSummary.dayIndex !== null ? home.tripSummary.dayIndex + 1 : 1)).replace("{total}", String(home.tripSummary.dayCount || 0))}</span><strong>{home.tripSummary.nextPlaceLabel || resolveLabel(language, t, stateTitleKey(home.state))}</strong></div>}
            {home.tripSummary.nextPlaceLabel && <div><span>{tripDayTranslate(language, "tripDay.whatsNext")}</span><strong>{home.tripSummary.nextPlaceLabel}</strong></div>}
            {home.tripSummary.progress && <div><span>{tripDayTranslate(language, "tripDay.progress").replace("{visited}", String(home.tripSummary.progress.visited)).replace("{remaining}", String(home.tripSummary.progress.remaining)).replace("{skipped}", String(home.tripSummary.progress.skipped))}</span><strong>{formatProgress(home.tripSummary.progress, language)}</strong></div>}
          </div>
        </section>
      )}

      {home.todaySummary && (home.state === "active_trip" || home.state === "departure_day" || home.state === "day_complete") && (
        <section className="home-context-card fa-card" aria-labelledby="home-today-title">
          <div className="home-context-card-heading">
            <div>
              <span>{tripDayTranslate(language, "tripDay.title")}</span>
              <h2 id="home-today-title">{home.todaySummary.tripName}</h2>
            </div>
            <CalendarDays size={20} aria-hidden="true" />
          </div>
          <div className="home-trip-summary-grid">
            {home.todaySummary.dayLabel && <div><span>{tripDayTranslate(language, "tripDay.dayOf").replace("{day}", String(home.todaySummary.dayIndex !== null ? home.todaySummary.dayIndex + 1 : 1)).replace("{total}", String(home.todaySummary.dayCount || 0))}</span><strong>{home.todaySummary.dayLabel}</strong></div>}
            {home.todaySummary.nextPlaceLabel && <div><span>{tripDayTranslate(language, "tripDay.whatsNext")}</span><strong>{home.todaySummary.nextPlaceLabel}</strong></div>}
            {home.todaySummary.progress && <div><span>{tripDayTranslate(language, "tripDay.progress").replace("{visited}", String(home.todaySummary.progress.visited)).replace("{remaining}", String(home.todaySummary.progress.remaining)).replace("{skipped}", String(home.todaySummary.progress.skipped))}</span><strong>{formatProgress(home.todaySummary.progress, language)}</strong></div>}
          </div>
          <button className="fa-button-secondary" type="button" onClick={() => runAction({ ...home.primaryAction, target: { kind: "tab", tab: "today" } }, { setExploreCategory, setMapDestination, setSelectedRestaurant, setTab, onOpenDestination, onOpenPreparation, onOpenTripDay })}>
            {tripDayTranslate(language, "tripDay.title")}
          </button>
        </section>
      )}

      {home.preparationSummary && home.state !== "ended_trip" && home.state !== "multiple_trips" && home.preparationSummary.attentionCount > 0 && (
        <section className="home-context-card fa-card" aria-labelledby="home-preparation-title">
          <div className="home-context-card-heading">
            <div>
              <span>{copyKey(t, "travelPreparation.title")}</span>
              <h2 id="home-preparation-title">{copyKey(t, "travelPreparation.title")}</h2>
            </div>
            <Wrench size={20} aria-hidden="true" />
          </div>
          <p>{tripDayTranslate(language, "tripDay.notice.preparation_attention")}</p>
          <button className="fa-button-secondary" type="button" onClick={() => runAction({ ...home.primaryAction, target: home.tripSummary ? { kind: "preparation", tripId: home.tripSummary.tripId } : { kind: "tab", tab: "tripDrafts" } }, { setExploreCategory, setMapDestination, setSelectedRestaurant, setTab, onOpenDestination, onOpenPreparation, onOpenTripDay })}>
            {copyKey(t, "travelPreparation.title")}
          </button>
        </section>
      )}

      {home.destinationSummary && (
        <section className="home-context-card fa-card" aria-labelledby="home-destination-title">
          <div className="home-context-card-heading">
            <div>
              <span>{t.travelGuides}</span>
              <h2 id="home-destination-title">{home.destinationSummary.cityLabel || home.destinationSummary.countryLabel || t.travelGuides}</h2>
            </div>
            <Compass size={20} aria-hidden="true" />
          </div>
          <div className="home-trip-summary-grid">
            {home.destinationSummary.countryLabel && <div><span>{t.travelGuides}</span><strong>{home.destinationSummary.countryLabel}</strong></div>}
            {home.destinationSummary.currencyCode && <div><span>{t.currency}</span><strong>{home.destinationSummary.currencyCode}</strong></div>}
            {home.destinationSummary.languages.length > 0 && <div><span>{t.translate}</span><strong>{home.destinationSummary.languages.join(" · ")}</strong></div>}
            <div><span>{t.sosEmergency}</span><strong>{home.destinationSummary.emergencyAvailable ? t.offlineEmergencyNumbers : t.offlineLiveUnavailable}</strong></div>
            {home.destinationSummary.timezone && <div><span>Timezone</span><strong>{home.destinationSummary.timezone}</strong></div>}
          </div>
          <button className="fa-button-secondary" type="button" onClick={() => {
            if (home.destinationSummary?.destinationId && onOpenDestination) {
              onOpenDestination(home.destinationSummary.destinationId);
              return;
            }
            setTab("guides");
          }}>
            {t.travelGuides}
          </button>
        </section>
      )}

      <section className="home-context-card fa-card" aria-labelledby="home-discovery-title">
        <div className="home-context-card-heading">
          <div>
            <span>{copyKey(t, "travelDiscovery.title")}</span>
            <h2 id="home-discovery-title">{discovery.destination?.destinationLabel || t.exploreTitle}</h2>
          </div>
          <Compass size={20} aria-hidden="true" />
        </div>
        <p>{copyKey(t, "travelDiscovery.subtitle")}</p>
        {discovery.hasResolvedDestination ? (
          <div className="home-discovery-grid" role="list" aria-label={copyKey(t, "travelDiscovery.title")}>
            {discovery.sections.filter((section) => section.visible).map((section) => (
              <button
                key={section.id}
                className="home-discovery-item"
                type="button"
                onClick={() => openDiscoverySection(section, { setExploreCategory, setTab })}
              >
                <strong>{copyKey(t, section.labelKey)}</strong>
                <small>{copyKey(t, availabilityLabelKey(section.availability))}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="home-discovery-empty">
            <button className="fa-button-secondary" type="button" onClick={() => setTab("explore")}>
              {t.explore}
            </button>
          </div>
        )}
      </section>

      {(home.state === "ended_trip" || home.state === "no_trip") && (
        <section className="home-context-card fa-card" aria-labelledby="home-memory-title">
          <div className="home-context-card-heading">
            <div>
              <span>{copyKey(t, "travelPassport.title")}</span>
              <h2 id="home-memory-title">{home.state === "ended_trip" ? copyKey(t, "home.state.ended.title") : copyKey(t, "home.state.noTrip.title")}</h2>
            </div>
            <BookOpen size={20} aria-hidden="true" />
          </div>
          <p>{home.state === "ended_trip" ? copyKey(t, "home.state.ended.body") : copyKey(t, "home.state.noTrip.body")}</p>
          <div className="home-memory-actions">
            {[
              { key: "travelPassport.title", tab: "passport" as Tab },
              { key: "travelJournal.title", tab: "journal" as Tab },
              { key: "travelExplorer.title", tab: "explorer" as Tab }
            ].map((item) => (
              <button
                key={item.key}
                className="fa-button-secondary"
                type="button"
                onClick={() => setTab(item.tab)}
              >
                {copyKey(t, item.key)}
              </button>
            ))}
          </div>
        </section>
      )}

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

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function stateTitleKey(state: TravelHomeState) {
  if (state === "no_trip") return "home.state.noTrip.title";
  if (state === "planned_trip") return "home.state.planned.title";
  if (state === "approaching_trip") return "home.state.approaching.title";
  if (state === "departure_day") return "home.state.departure.title";
  if (state === "active_trip") return "home.state.active.title";
  if (state === "day_complete") return "home.state.dayComplete.title";
  if (state === "ended_trip") return "home.state.ended.title";
  if (state === "undated_trip") return "tripDay.noDate";
  return "tripDay.chooseTrip";
}

function buildHeroCopy(home: TravelHomeViewModel, t: HomeCopy, language: Language) {
  const badge = copyKey(t, stateTitleKey(home.state));

  if (!home.tripSummary) {
    if (home.state === "multiple_trips") {
      return {
        badge,
        title: tripDayTranslate(language, "tripDay.chooseTrip"),
        body: tripDayTranslate(language, "tripDay.chooseTrip"),
        detail: home.tripChooser?.trips.map((trip) => trip.tripName).join(" · ") || null
      };
    }

    if (home.state === "no_trip") {
      return {
        badge,
        title: copyKey(t, "home.state.noTrip.title"),
        body: copyKey(t, "home.state.noTrip.body"),
        detail: null
      };
    }

    return {
      badge,
      title: tripDayTranslate(language, "tripDay.noDate"),
      body: tripDayTranslate(language, "tripDay.undated"),
      detail: null
    };
  }

  const title = home.tripSummary.tripName;
  const detail = [home.tripSummary.destinationLabel, home.tripSummary.dayLabel, home.tripSummary.nextPlaceLabel]
    .filter(Boolean)
    .join(" · ");

  if (home.state === "planned_trip") {
    return {
      badge,
      title,
      body: copyKey(t, "home.state.planned.body").replace("{destination}", home.tripSummary.destinationLabel || ""),
      detail
    };
  }

  if (home.state === "approaching_trip") {
    return {
      badge,
      title,
      body: home.tripSummary.daysUntilDeparture !== null
        ? tripDayTranslate(language, "tripDay.homeUpcoming").replace("{days}", String(home.tripSummary.daysUntilDeparture))
        : copyKey(t, "home.state.planned.body").replace("{destination}", home.tripSummary.destinationLabel || ""),
      detail
    };
  }

  if (home.state === "departure_day") {
    return {
      badge,
      title,
      body: tripDayTranslate(language, "tripDay.beforeTrip"),
      detail
    };
  }

  if (home.state === "active_trip") {
    return {
      badge,
      title,
      body: home.tripSummary.nextPlaceLabel || tripDayTranslate(language, "tripDay.homeActive"),
      detail
    };
  }

  if (home.state === "day_complete") {
    return {
      badge,
      title,
      body: tripDayTranslate(language, "tripDay.dayComplete"),
      detail
    };
  }

  if (home.state === "ended_trip") {
    return {
      badge,
      title,
      body: copyKey(t, "home.state.ended.body"),
      detail
    };
  }

  return {
    badge,
    title,
    body: tripDayTranslate(language, "tripDay.undated"),
    detail
  };
}

function copyKey(t: HomeCopy, key: string) {
  const value = t[key as keyof HomeCopy];
  return typeof value === "string" ? value : key;
}

function resolveLabel(language: Language, t: HomeCopy, key: string) {
  if (key.startsWith("tripDay.")) {
    return tripDayTranslate(language, key);
  }
  return copyKey(t, key);
}

function formatProgress(progress: TripDayProgress, language: Language) {
  return tripDayTranslate(language, "tripDay.progress")
    .replace("{visited}", String(progress.visited))
    .replace("{remaining}", String(progress.remaining))
    .replace("{skipped}", String(progress.skipped));
}

function formatTripDateRange(startDate: string, endDate: string | null) {
  return endDate ? `${startDate} → ${endDate}` : startDate;
}

function availabilityLabelKey(availability: TravelDiscoverySection["availability"]) {
  if (availability === "available") return "travelDiscovery.available";
  if (availability === "limited") return "travelDiscovery.limited";
  if (availability === "online_required") return "travelDiscovery.onlineRequired";
  if (availability === "unsupported") return "travelDiscovery.unsupported";
  return "travelDiscovery.unknown";
}

function openDiscoverySection(
  section: TravelDiscoverySection,
  helpers: {
    setExploreCategory: (category: string) => void;
    setTab: (tab: Tab) => void;
  }
) {
  if (section.action.kind === "exploreCategory" && section.action.category) {
    helpers.setExploreCategory(section.action.category);
    helpers.setTab("explore");
    return;
  }

  if (section.action.tab === "transport") {
    helpers.setTab("transport");
    return;
  }

  if (section.action.tab === "matches") {
    helpers.setTab("matches");
    return;
  }

  if (section.action.tab === "traveltools") {
    helpers.setTab("traveltools");
    return;
  }

  helpers.setTab(section.action.tab || "explore");
}

function runAction(
  action: TravelHomeAction,
  helpers: {
    setExploreCategory: (category: string) => void;
    setMapDestination: (destination: MapDestination | null) => void;
    setSelectedRestaurant: (restaurant: any) => void;
    setTab: (tab: Tab) => void;
    onOpenDestination?: (destinationId: string) => void;
    onOpenPreparation?: (tripId: string) => void;
    onOpenTripDay?: (tripId: string) => void;
  }
) {
  const target = action.target;
  if (target.kind === "tab") {
    if (target.tab === "map") helpers.setMapDestination(null);
    if (target.tab === "explore") helpers.setExploreCategory("All");
    helpers.setTab(target.tab);
    return;
  }

  if (target.kind === "destination") {
    if (helpers.onOpenDestination) {
      helpers.onOpenDestination(target.destinationId);
      return;
    }
    helpers.setTab("guides");
    return;
  }

  if (target.kind === "preparation") {
    if (helpers.onOpenPreparation) {
      helpers.onOpenPreparation(target.tripId);
      return;
    }
    helpers.setTab("tripDrafts");
    return;
  }

  if (target.kind === "tripDay") {
    if (helpers.onOpenTripDay) {
      helpers.onOpenTripDay(target.tripId);
      return;
    }
    helpers.setTab("today");
    return;
  }

  if (target.kind === "map") {
    helpers.setTab("map");
  }
}

function iconForAction(labelKey: string) {
  if (labelKey === "travelPreparation.title") return <Wrench size={16} aria-hidden="true" />;
  if (labelKey === "travelGuides" || labelKey === "travelExplorer.title" || labelKey === "tripDay.chooseTrip") return <Compass size={16} aria-hidden="true" />;
  if (labelKey === "travelPassport.title" || labelKey === "travelJournal.title") return <BookOpen size={16} aria-hidden="true" />;
  if (labelKey === "sosEmergency") return <Shield size={16} aria-hidden="true" />;
  if (labelKey === "map" || labelKey === "travelLocation") return <MapPin size={16} aria-hidden="true" />;
  if (labelKey === "translate") return <Languages size={16} aria-hidden="true" />;
  if (labelKey === "currency") return <Wallet size={16} aria-hidden="true" />;
  if (labelKey === "hotels") return <Hotel size={16} aria-hidden="true" />;
  if (labelKey === "travelTools") return <Wrench size={16} aria-hidden="true" />;
  if (labelKey === "tripDay.title" || labelKey === "tripDay.homeActive" || labelKey === "home.reviewTrip") return <CalendarDays size={16} aria-hidden="true" />;
  return <Compass size={16} aria-hidden="true" />;
}

function openSearchResult(
  result: HomeSearchResult,
  setMapDestination: (destination: MapDestination | null) => void,
  setSelectedRestaurant: (restaurant: any) => void,
  setExploreCategory: (category: string) => void,
  setTab: (tab: Tab) => void,
  onOpenDestination?: (destinationId: string) => void
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

  if (result.type === "destination" && result.destinationId && onOpenDestination) {
    onOpenDestination(result.destinationId);
    return;
  }

  if (result.type === "hotel") {
    setTab("hotels");
    return;
  }

  setExploreCategory("All");
  setTab("explore");
}
