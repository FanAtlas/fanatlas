import { Suspense, lazy, useEffect, useState } from "react";
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

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const LANGUAGE_STORAGE_KEY = "fanatlas_language";
const LEGACY_LANGUAGE_STORAGE_KEY = "fanatlas.language";
const ADMIN_EMAIL = "kadsimohamedads@gmail.com";
const pageFallback = <div className="page-loading">Loading...</div>;
let highTrafficPagesPrefetched = false;
type PublicRoute = "/" | "/app" | "/privacy" | "/terms" | "/support";

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
  | "travelLocation";

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
  const [tab, setTab] = useState<Tab>("home");
  const [route, setRoute] = useState<PublicRoute>(() => routeFromPath(window.location.pathname));
  const [previousTab, setPreviousTab] = useState<Tab | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedStadium, setSelectedStadium] = useState<MapDestination | null>(null);
  const [exploreCategory, setExploreCategory] = useState("fanzones");
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination | null>(null);
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());

  const t = text[language];

  function routeFromPath(pathname: string): PublicRoute {
    if (pathname === "/app") return "/app";
    if (pathname === "/privacy") return "/privacy";
    if (pathname === "/terms") return "/terms";
    if (pathname === "/support") return "/support";
    return "/";
  }

  function navigateRoute(nextRoute: PublicRoute) {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
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
      if (session?.user) {
        setTab("home");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setRoute(routeFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

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
    if (route !== "/app") {
      navigateRoute("/app");
    }

    if (nextTab !== tab) {
      setPreviousTab(tab);
      setTab(nextTab);
    }
  }

  function goBack() {
    const target = previousTab && previousTab !== tab ? previousTab : "home";
    setPreviousTab("home");
    setTab(target);
  }

  function goHome() {
    setPreviousTab("home");
    setTab("home");
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

  if (route !== "/app") {
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
          setMapDestination={setSelectedMapDestination}
          setSelectedRestaurant={setSelectedRestaurant}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "map") {
      return (
        <MapPage
          initialDestination={selectedMapDestination}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "explore") {
      return (
        <ExplorePage
          initialCategory={exploreCategory}
          setMapDestination={setSelectedMapDestination}
          setSelectedRestaurant={setSelectedRestaurant}
          setTab={navigateTo}
        />
      );
    }

    if (tab === "matches") {
      return (
        <MatchesPage
          setMapDestination={setSelectedMapDestination}
          setSelectedStadium={setSelectedStadium}
          setTab={navigateTo}
          setSelectedMatch={setSelectedMatch}
        />
      );
    }

    if (tab === "sos") {
      return (
        <SOSPage
          setMapDestination={setSelectedMapDestination}
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
          setMapDestination={setSelectedMapDestination}
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
          setMapDestination={setSelectedMapDestination}
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
          setExploreCategory={setExploreCategory}
          setMapDestination={setSelectedMapDestination}
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
          setMapDestination={setSelectedMapDestination}
          onBack={goBack}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "hotels") {
      return (
        <HotelsPage
          setMapDestination={setSelectedMapDestination}
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
          setMapDestination={setSelectedMapDestination}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "fanzonemerch") return <FanZoneMerchPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "vip") return <VIPPackagesPage setTab={navigateTo} />;
    if (tab === "transport") {
      return (
        <TransportationPage
          setMapDestination={setSelectedMapDestination}
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
          setMapDestination={setSelectedMapDestination}
          setTab={navigateTo}
        />
      );
    }

    if (tab === "restaurant") {
      return (
        <RestaurantDetailPage
          restaurant={selectedRestaurant}
          setExploreCategory={setExploreCategory}
          setMapDestination={setSelectedMapDestination}
          onBack={goBack}
          setTab={navigateTo}
        />
      );
    }

    return (
      <HomePage
        setExploreCategory={setExploreCategory}
        setMapDestination={setSelectedMapDestination}
        setSelectedRestaurant={setSelectedRestaurant}
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
                    if (item.id === "map") setSelectedMapDestination(null);
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
