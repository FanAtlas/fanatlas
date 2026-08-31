import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, MapPin, Compass, CalendarDays, User, Shield } from "lucide-react";
import "./styles.css";

import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";

import type { FanAtlasMatch } from "./services/worldcup2026";
import { supabase } from "./lib/supabase";
import { Language, text } from "./i18n";
import { LanguageContext } from "./LanguageContext";
import type { MapDestination } from "./mapDestinations";
import { getDueNotifications, markNotificationDelivered } from "./services/notifications";
import { LocationProvider } from "./LocationContext";
import { TravelLocationProvider } from "./TravelLocationContext";
import { GlobalPlacesProvider } from "./hooks/useGlobalPlaces";
import { registerFanAtlasServiceWorker } from "./lib/registerServiceWorker";
import {
  buildNavigationRequestFromMapDestination,
  navigationSearchParams,
  parseNavigationRequestFromLocation,
  type NavigationRequest,
  type NavigationSource
} from "./lib/navigation";

const MapPage = lazy(() => import("./pages/MapPage").then((module) => ({ default: module.MapPage })));
const ExplorePage = lazy(() => import("./pages/ExplorePage").then((module) => ({ default: module.ExplorePage })));
const MatchesPage = lazy(() => import("./pages/MatchesPage").then((module) => ({ default: module.MatchesPage })));
const SOSPage = lazy(() => import("./pages/SOSPage").then((module) => ({ default: module.SOSPage })));
const AIChatPage = lazy(() => import("./pages/AIChatPage").then((module) => ({ default: module.AIChatPage })));
const TravelGuidesPage = lazy(() => import("./pages/TravelGuidesPage").then((module) => ({ default: module.TravelGuidesPage })));
const CurrencyConverterPage = lazy(() => import("./pages/CurrencyConverterPage").then((module) => ({ default: module.CurrencyConverterPage })));
const VoiceTranslatorPage = lazy(() => import("./pages/VoiceTranslatorPage").then((module) => ({ default: module.VoiceTranslatorPage })));
const TVConnectPage = lazy(() => import("./pages/TVConnectPage").then((module) => ({ default: module.TVConnectPage })));
const MatchDayPage = lazy(() => import("./pages/MatchDayPage").then((module) => ({ default: module.MatchDayPage })));
const HotelsPage = lazy(() => import("./pages/HotelsPage").then((module) => ({ default: module.HotelsPage })));
const ESimPage = lazy(() => import("./pages/ESimPage").then((module) => ({ default: module.ESimPage })));
const RestaurantDetailPage = lazy(() => import("./pages/RestaurantDetailPage").then((module) => ({ default: module.RestaurantDetailPage })));
const TicketsPage = lazy(() => import("./pages/TicketsPage").then((module) => ({ default: module.TicketsPage })));
const FanZonesPage = lazy(() => import("./pages/FanZonesPage").then((module) => ({ default: module.FanZonesPage })));
const VIPPackagesPage = lazy(() => import("./pages/VIPPackagesPage").then((module) => ({ default: module.VIPPackagesPage })));
const TransportationPage = lazy(() => import("./pages/TransportationPage").then((module) => ({ default: module.TransportationPage })));
const MerchandisePage = lazy(() => import("./pages/MerchandisePage").then((module) => ({ default: module.MerchandisePage })));
const FanZoneVIPPage = lazy(() => import("./pages/FanZoneVIPPage").then((module) => ({ default: module.FanZoneVIPPage })));
const FanZoneTransportPage = lazy(() => import("./pages/FanZoneTransportPage").then((module) => ({ default: module.FanZoneTransportPage })));
const FanZoneMerchPage = lazy(() => import("./pages/FanZoneMerchPage").then((module) => ({ default: module.FanZoneMerchPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const PremiumPage = lazy(() => import("./pages/PremiumPage").then((module) => ({ default: module.PremiumPage })));
const StadiumDetailPage = lazy(() => import("./pages/StadiumDetailPage").then((module) => ({ default: module.StadiumDetailPage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then((module) => ({ default: module.FavoritesPage })));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage").then((module) => ({ default: module.CollectionsPage })));
const TripDraftsPage = lazy(() => import("./pages/TripDraftsPage").then((module) => ({ default: module.TripDraftsPage })));
const OfflineGuidePage = lazy(() => import("./pages/OfflineGuidePage").then((module) => ({ default: module.OfflineGuidePage })));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage").then((module) => ({ default: module.NotificationSettingsPage })));
const RevenueDashboardPage = lazy(() => import("./pages/RevenueDashboardPage").then((module) => ({ default: module.RevenueDashboardPage })));
const CityGuidePage = lazy(() => import("./pages/CityGuidePage").then((module) => ({ default: module.CityGuidePage })));
const ExpenseTrackerPage = lazy(() => import("./pages/ExpenseTrackerPage").then((module) => ({ default: module.ExpenseTrackerPage })));
const ChecklistPage = lazy(() => import("./pages/ChecklistPage").then((module) => ({ default: module.ChecklistPage })));
const MeetupPage = lazy(() => import("./pages/MeetupPage").then((module) => ({ default: module.MeetupPage })));
const PhrasebookPage = lazy(() => import("./pages/PhrasebookPage").then((module) => ({ default: module.PhrasebookPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const TravelToolsPage = lazy(() => import("./pages/TravelToolsPage").then((module) => ({ default: module.TravelToolsPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((module) => ({ default: module.TermsPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then((module) => ({ default: module.SupportPage })));
const TravelLocationPage = lazy(() => import("./pages/TravelLocationPage").then((module) => ({ default: module.TravelLocationPage })));
const TravelPassportPage = lazy(() => import("./pages/TravelPassportPage").then((module) => ({ default: module.TravelPassportPage })));
const TravelJournalPage = lazy(() => import("./pages/TravelJournalPage").then((module) => ({ default: module.TravelJournalPage })));
const TravelInsightsPage = lazy(() => import("./pages/TravelInsightsPage").then((module) => ({ default: module.TravelInsightsPage })));
const TravelExplorerPage = lazy(() => import("./pages/TravelExplorerPage").then((module) => ({ default: module.TravelExplorerPage })));
const DestinationHubPage = lazy(() => import("./pages/DestinationHubPage").then((module) => ({ default: module.DestinationHubPage })));
const TravelPreparationPage = lazy(() => import("./pages/TravelPreparationPage").then((module) => ({ default: module.TravelPreparationPage })));
const TripDayPage = lazy(() => import("./pages/TripDayPage").then((module) => ({ default: module.TripDayPage })));

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const LANGUAGE_STORAGE_KEY = "fanatlas_language";
const LEGACY_LANGUAGE_STORAGE_KEY = "fanatlas.language";
const ADMIN_EMAIL = "kadsimohamedads@gmail.com";
const pageFallback = <div className="page-loading">Loading...</div>;
let highTrafficPagesPrefetched = false;
type PublicRoute = "/" | "/app" | "/ai" | "/passport" | "/journal" | "/insights" | "/explorer" | "/today" | "/map" | `/trip-day/${string}` | `/destination/${string}` | `/preparation/${string}` | "/privacy" | "/terms" | "/support";

export type Tab =
  | "home"
  | "map"
  | "explore"
  | "matches"
  | "sos"
  | "profile"
  | "ai"
  | "guides"
  | "currency"
  | "translator"
  | "tv"
  | "matchday"
  | "hotels"
  | "esim"
  | "restaurant"
  | "tickets"
  | "fanzones"
  | "vip"
  | "transport"
  | "merchandise"
  | "fanzonevip"
  | "fanzonetransport"
  | "fanzonemerch"
  | "notifications"
  | "premium"
  | "stadium"
  | "favorites"
  | "collections"
  | "tripDrafts"
  | "offline"
  | "cityguide"
  | "expenses"
  | "checklist"
  | "meetups"
  | "phrasebook"
  | "traveltools"
  | "admin"
  | "notificationSettings"
  | "revenue"
  | "privacy"
  | "terms"
  | "support"
  | "travelLocation"
  | "passport"
  | "journal"
  | "insights"
  | "explorer"
  | "today"
  | "tripDay"
  | "destination"
  | "preparation";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "es" || value === "fr" || value === "ar" || value === "pt";
}

function browserLanguage(): Language {
  const code = navigator.language.slice(0, 2).toLowerCase();
  return isLanguage(code) ? code : "en";
}

function initialLanguage(): Language {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(storedLanguage)) return storedLanguage;

  const legacyLanguage = localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
  if (isLanguage(legacyLanguage)) return legacyLanguage;

  return browserLanguage();
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [tab, setTab] = useState<Tab>(() => window.location.pathname === "/ai" ? "ai" : window.location.pathname === "/passport" ? "passport" : window.location.pathname === "/journal" ? "journal" : window.location.pathname === "/insights" ? "insights" : window.location.pathname === "/explorer" ? "explorer" : window.location.pathname === "/today" ? "today" : window.location.pathname === "/map" ? "map" : window.location.pathname.startsWith("/trip-day/") ? "tripDay" : window.location.pathname.startsWith("/destination/") ? "destination" : window.location.pathname.startsWith("/preparation/") ? "preparation" : "home");
  const [route, setRoute] = useState<PublicRoute>(() => routeFromPath(window.location.pathname));
  const [previousTab, setPreviousTab] = useState<Tab | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedStadium, setSelectedStadium] = useState<MapDestination | null>(null);
  const [exploreCategory, setExploreCategory] = useState("fanzones");
  const [selectedMapNavigationRequest, setSelectedMapNavigationRequest] = useState<NavigationRequest | null>(() => parseNavigationRequestFromLocation(window.location.pathname === "/map" ? window.location : { search: "" }));
  const selectedMapNavigationRequestRef = useRef<NavigationRequest | null>(selectedMapNavigationRequest);
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());

  const t = text[language];

  useEffect(() => {
    selectedMapNavigationRequestRef.current = selectedMapNavigationRequest;
  }, [selectedMapNavigationRequest]);

  function routeFromPath(pathname: string): PublicRoute {
    if (pathname === "/app") return "/app";
    if (pathname === "/ai") return "/ai";
    if (pathname === "/passport") return "/passport";
    if (pathname === "/journal") return "/journal";
    if (pathname === "/insights") return "/insights";
    if (pathname === "/explorer") return "/explorer";
    if (pathname === "/today") return "/today";
    if (pathname === "/map") return "/map";
    if (pathname.startsWith("/trip-day/")) return pathname as `/trip-day/${string}`;
    if (pathname.startsWith("/destination/")) return pathname as `/destination/${string}`;
    if (pathname.startsWith("/preparation/")) return pathname as `/preparation/${string}`;
    if (pathname === "/privacy") return "/privacy";
    if (pathname === "/terms") return "/terms";
    if (pathname === "/support") return "/support";
    return "/";
  }

  function navigateRoute(nextRoute: PublicRoute) {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
  }

  function navigateMapRoute(request: NavigationRequest | null) {
    const query = request ? `?${navigationSearchParams(request).toString()}` : "";
    const nextRoute = `/map${query}` as PublicRoute;
    if (route !== "/map" || window.location.search !== query) {
      navigateRoute(nextRoute);
    }
  }

  function updateAdminAccess(nextSession: any) {
    const email = nextSession?.user?.email?.toLowerCase() || "";
    setIsAdminEmail(email === ADMIN_EMAIL);
  }

  function applyLanguage(language: Language) {
    setLanguageState(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  async function setLanguage(language: Language) {
    applyLanguage(language);

    if (!supabase || !session?.user) return;

    await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        email: session.user.email,
        username: session.user.email?.split("@")[0],
        language
      });
  }

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      updateAdminAccess(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      updateAdminAccess(session);
      if (session?.user && window.location.pathname !== "/ai" && window.location.pathname !== "/passport" && window.location.pathname !== "/journal" && window.location.pathname !== "/insights" && window.location.pathname !== "/explorer" && window.location.pathname !== "/today" && window.location.pathname !== "/map" && !window.location.pathname.startsWith("/trip-day/") && !window.location.pathname.startsWith("/destination/") && !window.location.pathname.startsWith("/preparation/")) {
        setTab("home");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextRoute = routeFromPath(window.location.pathname);
      setRoute(nextRoute);
      if (nextRoute === "/ai") setTab("ai");
      if (nextRoute === "/passport") setTab("passport");
      if (nextRoute === "/journal") setTab("journal");
      if (nextRoute === "/insights") setTab("insights");
      if (nextRoute === "/explorer") setTab("explorer");
      if (nextRoute === "/today") setTab("today");
      if (nextRoute === "/map") {
        const parsed = parseNavigationRequestFromLocation(window.location);
        setSelectedMapNavigationRequest(parsed);
        selectedMapNavigationRequestRef.current = parsed;
        setTab("map");
      }
      if (nextRoute.startsWith("/trip-day/")) setTab("tripDay");
      if (nextRoute.startsWith("/destination/")) setTab("destination");
      if (nextRoute.startsWith("/preparation/")) setTab("preparation");
      if (nextRoute === "/app") setTab((current) => current === "ai" || current === "passport" || current === "journal" || current === "insights" || current === "explorer" || current === "today" || current === "tripDay" || current === "destination" || current === "preparation" ? "profile" : current);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    if (import.meta.env.PROD) {
      void registerFanAtlasServiceWorker();
    }
  }, []);

  useEffect(() => {
    function deliverDueNotifications() {
      getDueNotifications().forEach((notification) => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.message
          });
        }

        markNotificationDelivered(notification.id);
      });
    }

    deliverDueNotifications();
    const timer = window.setInterval(deliverDueNotifications, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (route !== "/app" || tab !== "home" || !session || highTrafficPagesPrefetched) return;

    let cancelled = false;
    const idleWindow = window as IdleWindow;
    const prefetchHighTrafficPages = () => {
      if (cancelled || highTrafficPagesPrefetched) return;
      highTrafficPagesPrefetched = true;
      Promise.all([
        import("./pages/ExplorePage"),
        import("./pages/HotelsPage"),
        import("./pages/MapPage"),
        import("./pages/SOSPage")
      ]).catch((error) => {
        console.debug("High-traffic page prefetch failed:", error);
      });
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prefetchHighTrafficPages, { timeout: 3000 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(prefetchHighTrafficPages, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [route, session, tab]);

  function navigateTo(nextTab: Tab) {
    const nextRoute =
      nextTab === "ai" ? "/ai" :
      nextTab === "passport" ? "/passport" :
      nextTab === "journal" ? "/journal" :
      nextTab === "insights" ? "/insights" :
      nextTab === "explorer" ? "/explorer" :
      nextTab === "today" ? "/today" :
      nextTab === "map" ? null :
      "/app";
    if (nextTab === "map") {
      navigateMapRoute(selectedMapNavigationRequestRef.current);
    } else if (route !== nextRoute) {
      navigateRoute(nextRoute);
    }

    if (nextTab !== tab) {
      setPreviousTab(tab);
      setTab(nextTab);
    }
  }

  function goBack() {
    const target = previousTab && previousTab !== tab ? previousTab : "home";
    setPreviousTab("home");
    if (route !== "/app") navigateRoute("/app");
    setTab(target);
  }

  function selectMapDestination(destination: MapDestination | null, source: NavigationSource = "manual") {
    const request = destination ? buildNavigationRequestFromMapDestination(destination, source) : null;
    setSelectedMapNavigationRequest(request);
    selectedMapNavigationRequestRef.current = request;
  }

  function goHome() {
    setPreviousTab("home");
    setTab("home");
  }

  function openDestination(destinationId: string) {
    setPreviousTab(tab);
    setTab("destination");
    navigateRoute(`/destination/${encodeURIComponent(destinationId)}`);
  }

  function openPreparation(tripId: string) {
    setPreviousTab(tab);
    setTab("preparation");
    navigateRoute(`/preparation/${encodeURIComponent(tripId)}`);
  }

  function openTripDay(tripId: string) {
    setPreviousTab(tab);
    setTab("tripDay");
    navigateRoute(`/trip-day/${encodeURIComponent(tripId)}`);
  }

  function openApp(nextTab: Tab = "home") {
    setPreviousTab("home");
    setTab(nextTab);
    navigateRoute("/app");
  }

  function publicBack() {
    navigateRoute("/");
  }

  if (route === "/privacy") {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <Suspense fallback={pageFallback}>
          <PrivacyPage onBack={publicBack} />
        </Suspense>
      </LanguageContext.Provider>
    );
  }

  if (route === "/terms") {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <Suspense fallback={pageFallback}>
          <TermsPage onBack={publicBack} />
        </Suspense>
      </LanguageContext.Provider>
    );
  }

  if (route === "/support") {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <Suspense fallback={pageFallback}>
          <SupportPage onBack={publicBack} />
        </Suspense>
      </LanguageContext.Provider>
    );
  }

  if (route !== "/app" && route !== "/ai" && route !== "/passport" && route !== "/journal" && route !== "/insights" && route !== "/explorer" && route !== "/today" && route !== "/map" && !route.startsWith("/trip-day/") && !route.startsWith("/destination/") && !route.startsWith("/preparation/")) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <LandingPage
          onOpenApp={() => openApp("home")}
          onExploreEventMode={() => openApp("matches")}
          onNavigateLegal={(page) => navigateRoute(`/${page}`)}
        />
      </LanguageContext.Provider>
    );
  }

  if (!session) {
    const publicPage =
      tab === "privacy" ? <PrivacyPage onBack={goHome} /> :
      tab === "terms" ? <TermsPage onBack={goHome} /> :
      tab === "support" ? <SupportPage onBack={goHome} /> :
      <AuthPage setTab={navigateTo} />;

    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <Suspense fallback={pageFallback}>
          {publicPage}
        </Suspense>
      </LanguageContext.Provider>
    );
  }

  const render = () => {
    if (tab === "home") {
      return (
        <HomePage
          setExploreCategory={setExploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "manual")}
          setSelectedRestaurant={setSelectedRestaurant}
          onOpenDestination={openDestination}
          onOpenPreparation={openPreparation}
          onOpenTripDay={openTripDay}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "map") {
      return (
        <MapPage
          initialNavigationRequest={selectedMapNavigationRequest}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "explore") {
      return (
        <ExplorePage
          initialCategory={exploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "explore")}
          setSelectedRestaurant={setSelectedRestaurant}
          setTab={navigateTo}
        />
      );
    }

    if (tab === "matches") {
      return (
        <MatchesPage
          setMapDestination={(destination) => selectMapDestination(destination, "stadium")}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
          setSelectedMatch={setSelectedMatch}
        />
      );
    }

    if (tab === "sos") {
      return (
        <SOSPage
          setMapDestination={(destination) => selectMapDestination(destination, "sos")}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "profile") {
      return (
        <ProfilePage
          isAdmin={isAdminEmail}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "ai") return <AIChatPage onBack={goBack} />;
    if (tab === "guides") return <TravelGuidesPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "offline") return <OfflineGuidePage onBack={goBack} />;
    if (tab === "cityguide") return <CityGuidePage />;
    if (tab === "expenses") return <ExpenseTrackerPage onBack={goBack} />;
    if (tab === "checklist") return <ChecklistPage onBack={goBack} />;
    if (tab === "meetups") return <MeetupPage />;
    if (tab === "phrasebook") return <PhrasebookPage onBack={goBack} />;
    if (tab === "traveltools") return <TravelToolsPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "travelLocation") return <TravelLocationPage onBack={goBack} onSaved={goHome} />;
    if (tab === "passport") {
      return (
        <TravelPassportPage
          onBack={goBack}
          onOpenDestination={openDestination}
          setTab={navigateTo}
          displayName={session.user.user_metadata?.name || session.user.email?.split("@")[0]}
        />
      );
    }
    if (tab === "journal") return <TravelJournalPage onBack={goBack} />;
    if (tab === "insights") return <TravelInsightsPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "explorer") return <TravelExplorerPage onBack={goBack} onOpenDestination={openDestination} setTab={navigateTo} />;
    if (tab === "today") return <TripDayPage userId={session.user.id} onBack={goBack} onOpenDestination={openDestination} onOpenMapDestination={(destination) => selectMapDestination(destination, "trip_day")} setTab={navigateTo} />;
    if (tab === "tripDay") {
      const tripId = route.startsWith("/trip-day/") ? decodeTripDayTripId(route) : null;
      return <TripDayPage userId={session.user.id} tripId={tripId} onBack={goBack} onOpenDestination={openDestination} onOpenMapDestination={(destination) => selectMapDestination(destination, "trip_day")} setTab={navigateTo} />;
    }
    if (tab === "destination") {
      const destinationId = route.startsWith("/destination/") ? decodeDestinationId(route) : null;
      return <DestinationHubPage destinationId={destinationId} onBack={goBack} onOpenDestination={openDestination} setTab={navigateTo} />;
    }
    if (tab === "preparation") {
      const tripId = route.startsWith("/preparation/") ? decodePreparationTripId(route) : null;
      return <TravelPreparationPage tripId={tripId} onBack={goBack} onOpenDestination={openDestination} setTab={navigateTo} />;
    }
    if (tab === "privacy") return <PrivacyPage onBack={goHome} />;
    if (tab === "terms") return <TermsPage onBack={goHome} />;
    if (tab === "support") return <SupportPage onBack={goHome} />;
    if (tab === "admin") {
      return isAdminEmail ? (
        <AdminPage onBack={goBack} />
      ) : (
        <AccessDenied onHome={() => navigateTo("home")} />
      );
    }
    if (tab === "currency") return <CurrencyConverterPage onBack={goBack} />;
    if (tab === "translator") return <VoiceTranslatorPage onBack={goBack} />;
    if (tab === "tickets") {
      return (
        <TicketsPage
          onBack={goBack}
          setSelectedMatch={setSelectedMatch}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "tv") return <TVConnectPage />;
    if (tab === "notifications") return <NotificationsPage setTab={navigateTo} />;
    if (tab === "notificationSettings") return <NotificationSettingsPage setTab={navigateTo} />;
    if (tab === "revenue") {
      return isAdminEmail ? (
        <RevenueDashboardPage />
      ) : (
        <AccessDenied onHome={() => navigateTo("home")} />
      );
    }
    if (tab === "premium") return <PremiumPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "favorites") {
      return (
        <FavoritesPage
          userId={session.user.id}
          setExploreCategory={setExploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "manual")}
          setSelectedRestaurant={setSelectedRestaurant}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "collections") {
      return (
        <CollectionsPage
          userId={session.user.id}
          onBack={goBack}
          setExploreCategory={setExploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "manual")}
          setSelectedRestaurant={setSelectedRestaurant}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "tripDrafts") {
      return (
        <TripDraftsPage
          userId={session.user.id}
          onBack={goBack}
          onOpenDestination={openDestination}
          onOpenPreparation={openPreparation}
          onOpenTripDay={openTripDay}
          setExploreCategory={setExploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "trip_draft")}
          setSelectedRestaurant={setSelectedRestaurant}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "stadium") {
      return (
        <StadiumDetailPage
          stadium={selectedStadium}
          setMapDestination={(destination) => selectMapDestination(destination, "stadium")}
          onBack={goBack}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "hotels") {
      return (
        <HotelsPage
          setMapDestination={(destination) => selectMapDestination(destination, "hotel")}
          onBack={goBack}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "esim") return <ESimPage onBack={goBack} />;
    if (tab === "fanzones") return <FanZonesPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "fanzonevip") return <FanZoneVIPPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "fanzonetransport") {
      return (
        <FanZoneTransportPage
          onBack={goBack}
          setMapDestination={(destination) => selectMapDestination(destination, "manual")}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "fanzonemerch") return <FanZoneMerchPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "vip") return <VIPPackagesPage setTab={navigateTo} />;
    if (tab === "transport") {
      return (
        <TransportationPage
          setMapDestination={(destination) => selectMapDestination(destination, "manual")}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "merchandise") return <MerchandisePage setTab={navigateTo} />;

    if (tab === "matchday") {
      return (
        <MatchDayPage
          match={selectedMatch}
          onBack={goBack}
          setMapDestination={(destination) => selectMapDestination(destination, "stadium")}
          setTab={navigateTo}
        />
      );
    }

    if (tab === "restaurant") {
      return (
        <RestaurantDetailPage
          restaurant={selectedRestaurant}
          setExploreCategory={setExploreCategory}
          setMapDestination={(destination) => selectMapDestination(destination, "restaurant")}
          onBack={goBack}
          setTab={navigateTo}
        />
      );
    }

    return (
      <HomePage
        setExploreCategory={setExploreCategory}
        setMapDestination={(destination) => selectMapDestination(destination, "manual")}
        setSelectedRestaurant={setSelectedRestaurant}
        onOpenDestination={openDestination}
        onOpenPreparation={openPreparation}
        onOpenTripDay={openTripDay}
        setTab={navigateTo}
      />
    );
  };

  const nav = [
    { id: "home", label: t.home, icon: Home },
    { id: "map", label: t.map, icon: MapPin },
    { id: "explore", label: t.explore, icon: Compass },
    { id: "matches", label: t.matches, icon: CalendarDays },
    { id: "sos", label: t.sos, icon: Shield },
    { id: "profile", label: t.profile, icon: User }
  ] as const;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t
      }}
    >
      <GlobalPlacesProvider>
        <div className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
          <main className="screen">
            <Suspense fallback={pageFallback}>
              {render()}
            </Suspense>
          </main>

          <nav className="bottom-nav">
            {nav.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className={`nav-btn ${tab === item.id ? "active" : ""}`}
                  onClick={() => {
                    if (item.id === "map") selectMapDestination(null);
                    navigateTo(item.id as Tab);
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </GlobalPlacesProvider>
    </LanguageContext.Provider>
  );
}

function decodeDestinationId(route: string) {
  try {
    return decodeURIComponent(route.slice("/destination/".length));
  } catch {
    return null;
  }
}

function decodeTripDayTripId(route: string) {
  try {
    return decodeURIComponent(route.slice("/trip-day/".length));
  } catch {
    return null;
  }
}

function decodePreparationTripId(route: string) {
  try {
    return decodeURIComponent(route.slice("/preparation/".length));
  } catch {
    return null;
  }
}

function AccessDenied({ onHome }: { onHome: () => void }) {
  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">FanAtlas <span>Access</span></div>
      </div>
      <section className="card-dark">
        <strong>Access denied</strong>
        <p className="subtle">Admin and revenue tools are restricted to the approved FanAtlas owner account.</p>
        <button className="primary-btn" onClick={onHome}>Go Home</button>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LocationProvider>
    <TravelLocationProvider>
      <App />
    </TravelLocationProvider>
  </LocationProvider>
);
