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
import { FanAtlasMatch } from "./services/worldcup2026";
import { supabase } from "./lib/supabase";
import { FanZonesPage } from "./pages/FanZonesPage";
import { Language, languages, text } from "./i18n";
import { LanguageContext } from "./LanguageContext";
import { OnboardingPage } from "./pages/OnboardingPage";

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
  | "fanzones";

function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [selectedMatch, setSelectedMatch] = useState<FanAtlasMatch | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const t = text[language];

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    if (data.session?.user) {
  supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", data.session.user.id)
    .single()
    .then(({ data }) => {
      setOnboardingComplete(data?.onboarding_complete === true);
    });
}  

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
  supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", session.user.id)
    .single()
    .then(({ data }) => {
      setOnboardingComplete(data?.onboarding_complete === true);
    });
}

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <AuthPage />;
  }
if (!onboardingComplete) {
  return <OnboardingPage onComplete={() => setOnboardingComplete(true)} />;
}
      
  const render = () => {
    if (tab === "home") return <HomePage setTab={setTab} />;
    if (tab === "map") return <MapPage setTab={setTab} />;
    if (tab === "explore") return <ExplorePage setTab={setTab} />;
    if (tab === "matches")
      return (
        <MatchesPage
          setTab={setTab}
          setSelectedMatch={setSelectedMatch}
        />
      );
    if (tab === "sos") return <SOSPage />;
    if (tab === "profile") return <ProfilePage setTab={setTab} />;
    if (tab === "ai") return <AIChatPage />;
    if (tab === "guides") return <TravelGuidesPage />;
    if (tab === "currency") return <CurrencyConverterPage />;
    if (tab === "translator") return <VoiceTranslatorPage />;
    if (tab === "tickets") return <TicketsPage setTab={setTab} />;
    if (tab === "tv") return <TVConnectPage />;
    if (tab === "hotels") return <HotelsPage />;
    if (tab === "esim") return <ESimPage />;
    if (tab === "fanzones") return <FanZonesPage />;
    if (tab === "matchday")
      return <MatchDayPage match={selectedMatch} setTab={setTab} />;
    if (tab === "restaurant")
      return (
        <RestaurantDetailPage
          restaurant={selectedRestaurant}
          setTab={setTab}
        />
      );

    return <HomePage setTab={setTab} />;
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
              onClick={() => setTab(item.id as Tab)}
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
