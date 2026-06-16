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
import { OnboardingPage } from "./pages/OnboardingPage";
import { VIPPackagesPage } from "./pages/VIPPackagesPage";
import { TransportationPage } from "./pages/TransportationPage";
import { MerchandisePage } from "./pages/MerchandisePage";

import { FanAtlasMatch } from "./services/worldcup2026";
import { supabase } from "./lib/supabase";
import { Language, text } from "./i18n";
import { LanguageContext } from "./LanguageContext";
import { MapDestination } from "./mapDestinations";

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
  | "merchandise";

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "es" || value === "fr" || value === "ar" || value === "pt";
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedMapDestination, setSelectedMapDestination] = useState<MapDestination | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage) ? storedLanguage : "en";
  });

  const t = text[language];

  function applyLanguage(language: Language) {
    setLanguageState(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  async function loadProfile(userId: string) {
    if (!supabase) return;

    const { data } = await supabase
      .from("profiles")
      .select("onboarding_complete, language")
      .eq("id", userId)
      .single();

    setOnboardingComplete(data?.onboarding_complete === true);

    if (isLanguage(data?.language || null)) {
      applyLanguage(data.language);
    }
  }

  async function setLanguage(language: Language) {
    applyLanguage(language);

    if (!supabase || !session?.user) return;

    await supabase
      .from("profiles")
      .update({ language })
      .eq("id", session.user.id);
  }

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session?.user) {
        loadProfile(data.session.user.id);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setOnboardingComplete(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return <AuthPage />;
  }

  if (!onboardingComplete) {
    return (
      <LanguageContext.Provider
        value={{
          language,
          setLanguage,
          t
        }}
      >
        <div className="app-shell">
          <main className="screen">
            <OnboardingPage
              onComplete={() => {
                setTab("home");
                setOnboardingComplete(true);
              }}
            />
          </main>
        </div>
      </LanguageContext.Provider>
    );
  }

  const render = () => {
    if (tab === "home") {
      return (
        <HomePage
          setMapDestination={setSelectedMapDestination}
          setSelectedRestaurant={setSelectedRestaurant}
          setTab={setTab}
        />
      );
    }
    if (tab === "map") {
      return (
        <MapPage
          initialDestination={selectedMapDestination}
          setTab={setTab}
        />
      );
    }
    if (tab === "explore") {
      return (
        <ExplorePage
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }

    if (tab === "matches") {
      return (
        <MatchesPage
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
          setSelectedMatch={setSelectedMatch}
        />
      );
    }

    if (tab === "sos") return <SOSPage />;
    if (tab === "profile") {
      return (
        <ProfilePage
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }
    if (tab === "ai") return <AIChatPage />;
    if (tab === "guides") return <TravelGuidesPage />;
    if (tab === "currency") return <CurrencyConverterPage />;
    if (tab === "translator") return <VoiceTranslatorPage />;
    if (tab === "tickets") return <TicketsPage setTab={setTab} />;
    if (tab === "tv") return <TVConnectPage />;
    if (tab === "hotels") {
      return (
        <HotelsPage
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }
    if (tab === "esim") return <ESimPage />;
    if (tab === "fanzones") return <FanZonesPage setTab={setTab} />;
    if (tab === "vip") return <VIPPackagesPage setTab={setTab} />;
    if (tab === "transport") {
      return (
        <TransportationPage
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }
    if (tab === "merchandise") return <MerchandisePage setTab={setTab} />;

    if (tab === "matchday") {
      return (
        <MatchDayPage
          match={selectedMatch}
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }

    if (tab === "restaurant") {
      return (
        <RestaurantDetailPage
          restaurant={selectedRestaurant}
          setMapDestination={setSelectedMapDestination}
          setTab={setTab}
        />
      );
    }

    return (
      <HomePage
        setMapDestination={setSelectedMapDestination}
        setSelectedRestaurant={setSelectedRestaurant}
        setTab={setTab}
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
                  setTab(item.id as Tab);
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
