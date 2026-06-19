import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, MapPin, Compass, Trophy, User, Shield } from "lucide-react";
import "./styles.css";

import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { ExplorePage } from "./pages/ExplorePage";
import { MatchesPage } from "./pages/MatchesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SOSPage } from "./pages/SOSPage";
import { AIChatPage } from "./pages/AIChatPage";
import { TravelGuidesPage } from "./pages/TravelGuidesPage";
import { CurrencyConverterPage } from "./pages/CurrencyConverterPage";
import { VoiceTranslatorPage } from "./pages/VoiceTranslatorPage";
import { TVConnectPage } from "./pages/TVConnectPage";
import { MatchDayPage } from "./pages/MatchDayPage";
import { HotelsPage } from "./pages/HotelsPage";
import { ESimPage } from "./pages/ESimPage";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { AuthPage } from "./pages/AuthPage";
import { TicketsPage } from "./pages/TicketsPage";
import { FanZonesPage } from "./pages/FanZonesPage";
import { VIPPackagesPage } from "./pages/VIPPackagesPage";
import { TransportationPage } from "./pages/TransportationPage";
import { MerchandisePage } from "./pages/MerchandisePage";
import { FanZoneVIPPage } from "./pages/FanZoneVIPPage";
import { FanZoneTransportPage } from "./pages/FanZoneTransportPage";
import { FanZoneMerchPage } from "./pages/FanZoneMerchPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PremiumPage } from "./pages/PremiumPage";
import { StadiumDetailPage } from "./pages/StadiumDetailPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { OfflineGuidePage } from "./pages/OfflineGuidePage";
import { NotificationSettingsPage } from "./pages/NotificationSettingsPage";
import { RevenueDashboardPage } from "./pages/RevenueDashboardPage";
import { CityGuidePage } from "./pages/CityGuidePage";
import { ExpenseTrackerPage } from "./pages/ExpenseTrackerPage";
import { ChecklistPage } from "./pages/ChecklistPage";
import { MeetupPage } from "./pages/MeetupPage";
import { PhrasebookPage } from "./pages/PhrasebookPage";
import { AdminPage } from "./pages/AdminPage";
import { TravelToolsPage } from "./pages/TravelToolsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { SupportPage } from "./pages/SupportPage";

import { FanAtlasMatch } from "./services/worldcup2026";
import { supabase } from "./lib/supabase";
import { Language, text } from "./i18n";
import { LanguageContext } from "./LanguageContext";
import { MapDestination } from "./mapDestinations";
import { getDueNotifications, markNotificationDelivered } from "./services/notifications";

const LANGUAGE_STORAGE_KEY = "fanatlas_language";
const LEGACY_LANGUAGE_STORAGE_KEY = "fanatlas.language";
const ADMIN_EMAIL = "kadsimohamedads@gmail.com";

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
  | "support";

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
  const [previousTab, setPreviousTab] = useState<Tab | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedStadium, setSelectedStadium] = useState<MapDestination | null>(null);
  const [exploreCategory, setExploreCategory] = useState("fanzones");
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination | null>(null);
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());

  const t = text[language];

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

  function navigateTo(nextTab: Tab) {
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

  if (!session) {
    const publicPage =
      tab === "privacy" ? <PrivacyPage onBack={goHome} /> :
      tab === "terms" ? <TermsPage onBack={goHome} /> :
      tab === "support" ? <SupportPage onBack={goHome} /> :
      <AuthPage setTab={navigateTo} />;

    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        {publicPage}
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
    { id: "matches", label: t.matches, icon: Trophy },
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
      <div className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
        <main className="screen">{render()}</main>

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

createRoot(document.getElementById("root")!).render(<App />);
