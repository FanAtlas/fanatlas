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

import { FanAtlasMatch } from "./services/worldcup2026";
import { supabase } from "./lib/supabase";
import { Language, text } from "./i18n";
import { LanguageContext } from "./LanguageContext";
import { MapDestination } from "./mapDestinations";
import { getDueNotifications, markNotificationDelivered } from "./services/notifications";

const LANGUAGE_STORAGE_KEY = "fanatlas.language";

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
  | "revenue";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "es" || value === "fr" || value === "ar" || value === "pt";
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [previousTab, setPreviousTab] = useState<Tab | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedStadium, setSelectedStadium] = useState<MapDestination | null>(null);
  const [exploreCategory, setExploreCategory] = useState("fanzones");
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage) ? storedLanguage : "en";
  });

  const t = text[language];

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
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTab("home");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  if (!session) {
    return <AuthPage />;
  }

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
          setMapDestination={setSelectedMapDestination}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "ai") return <AIChatPage onBack={goBack} />;
    if (tab === "guides") return <TravelGuidesPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "offline") return <OfflineGuidePage />;
    if (tab === "cityguide") return <CityGuidePage />;
    if (tab === "expenses") return <ExpenseTrackerPage />;
    if (tab === "checklist") return <ChecklistPage />;
    if (tab === "meetups") return <MeetupPage />;
    if (tab === "phrasebook") return <PhrasebookPage />;
    if (tab === "traveltools") return <TravelToolsPage onBack={goBack} setTab={navigateTo} />;
    if (tab === "admin") return <AdminPage onBack={goBack} />;
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
    if (tab === "revenue") return <RevenueDashboardPage />;
    if (tab === "premium") return <PremiumPage setTab={navigateTo} />;
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
    if (tab === "fanzonevip") return <FanZoneVIPPage setTab={navigateTo} />;
    if (tab === "fanzonetransport") {
      return (
        <FanZoneTransportPage
          setMapDestination={setSelectedMapDestination}
          setTab={navigateTo}
        />
      );
    }
    if (tab === "fanzonemerch") return <FanZoneMerchPage setTab={navigateTo} />;
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
      <div className="app-shell">
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

createRoot(document.getElementById("root")!).render(<App />);
